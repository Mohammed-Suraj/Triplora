import crypto from 'node:crypto';
import { env } from '../config/env';
import { paymentRepository } from '../repositories/payment.repository';
import { userRepository } from '../repositories/user.repository';
import { ApiError } from '../utils/ApiError';
import { emailService, prefsOf } from './email.service';
import { notificationService } from './notification.service';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
}

function razorpayAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
}

function assertRazorpayConfigured(): void {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw ApiError.internal('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
}

async function createRazorpayOrder(amountInRupees: number, receipt: string): Promise<RazorpayOrder> {
  assertRazorpayConfigured();

  const amountInPaise = Math.round(amountInRupees * 100);
  if (amountInPaise < 100) {
    throw ApiError.badRequest('Payment amount must be at least 1 rupee');
  }

  const response = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: razorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw ApiError.badRequest('Failed to create Razorpay order. Please try again.');
  }

  return (await response.json()) as RazorpayOrder;
}

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  assertRazorpayConfigured();
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', env.razorpay.keySecret).update(body).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

function paymentSummary(booking: {
  id: string;
  bookingId: string;
  status: string;
  paymentStatus: string;
  paymentId: string | null;
  orderId: string | null;
  amount: number | null;
  currency: string | null;
  paidAt: Date | null;
  paymentMethod: string | null;
  budget: number;
}) {
  return {
    bookingId: booking.bookingId,
    bookingStatus: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentId: booking.paymentId,
    orderId: booking.orderId,
    amount: booking.amount ?? booking.budget,
    currency: booking.currency ?? 'INR',
    paidAt: booking.paidAt,
    paymentMethod: booking.paymentMethod,
  };
}

export const paymentService = {
  async createOrder(bookingId: string, userId: string) {
    const booking = await paymentRepository.findBookingByBookingId(bookingId);
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.userId !== userId) throw ApiError.forbidden('Not authorized to pay for this booking');

    if (booking.paymentStatus === 'PAID') {
      throw ApiError.badRequest('This booking has already been paid for');
    }
    if (booking.status === 'CANCELLED') {
      throw ApiError.badRequest('This booking has been cancelled and cannot be paid for');
    }

    const order = await createRazorpayOrder(booking.budget, booking.bookingId);
    await paymentRepository.updateOrderId(booking.id, order.id);

    return {
      bookingId: booking.bookingId,
      orderId: order.id,
      amount: order.amount,
      amountInRupees: order.amount / 100,
      currency: order.currency,
      keyId: env.razorpay.keyId,
    };
  },

  async verifyPayment(input: {
    bookingId: string;
    userId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const booking = await paymentRepository.findBookingByBookingId(input.bookingId);
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.userId !== input.userId) throw ApiError.forbidden('Not authorized to verify this payment');

    if (booking.paymentStatus === 'PAID') {
      throw ApiError.badRequest('This booking has already been paid for');
    }

    const signatureValid = verifyRazorpaySignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
    );

    if (!signatureValid) {
      await paymentRepository.markPaymentFailed(booking.id);
      throw ApiError.badRequest('Payment verification failed. Signature mismatch. Please try again.');
    }

    const updated = await paymentRepository.markPaymentPaid(booking.id, {
      paymentId: input.razorpayPaymentId,
      orderId: input.razorpayOrderId,
      amount: booking.budget,
      currency: 'INR',
      paidAt: new Date(),
      paymentMethod: 'razorpay',
    });

    const user = await userRepository.findById(updated.userId).catch(() => null);
    emailService.sendPaymentSuccessEmail(
      updated.email,
      {
        name: updated.fullName,
        bookingId: updated.bookingId,
        destinationName: updated.destination.name,
        amount: updated.amount ?? updated.budget,
        currency: updated.currency ?? 'INR',
        paymentId: updated.paymentId ?? input.razorpayPaymentId,
        paymentMethod: updated.paymentMethod ?? 'razorpay',
        paidAt: updated.paidAt ?? new Date(),
        bookingUrl: `${env.email.frontendUrl}/bookings/${updated.id}`,
      },
      user ? prefsOf(user) : null,
    );

    void notificationService.create(
      updated.userId,
      'PAYMENT_SUCCESS',
      'Payment successful',
      `Your payment of \u20B9${(updated.amount ?? updated.budget).toLocaleString('en-IN')} for ${updated.destination.name} was received.`,
      `/bookings/${updated.id}`,
    );

    return updated;
  },

  async retryPayment(bookingId: string, userId: string) {
    const booking = await paymentRepository.findBookingByBookingId(bookingId);
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.userId !== userId) throw ApiError.forbidden('Not authorized to pay for this booking');

    if (booking.paymentStatus === 'PAID') {
      throw ApiError.badRequest('This booking has already been paid for');
    }
    if (booking.status === 'CANCELLED') {
      throw ApiError.badRequest('This booking has been cancelled and cannot be paid for');
    }

    const order = await createRazorpayOrder(booking.budget, booking.bookingId);
    await paymentRepository.updateOrderId(booking.id, order.id);

    return {
      bookingId: booking.bookingId,
      orderId: order.id,
      amount: order.amount,
      amountInRupees: order.amount / 100,
      currency: order.currency,
      keyId: env.razorpay.keyId,
    };
  },

  async getPayment(bookingId: string, userId: string, userRole: string) {
    const booking = await paymentRepository.findBookingByBookingId(bookingId);
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.userId !== userId && userRole !== 'ADMIN') {
      throw ApiError.forbidden('Not authorized to view this payment');
    }
    return paymentSummary(booking);
  },
};