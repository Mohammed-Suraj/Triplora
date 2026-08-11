import { prisma } from '../config/db';
import type { PaymentStatus } from '@prisma/client';

const bookingInclude = {
  destination: { select: { id: true, name: true, slug: true, image: true, region: true, priceFrom: true } },
} as const;

export const paymentRepository = {
  findBookingByBookingId(bookingId: string) {
    return prisma.booking.findUnique({
      where: { bookingId },
      include: bookingInclude,
    });
  },

  findBookingById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });
  },

  updateOrderId(id: string, orderId: string) {
    return prisma.booking.update({
      where: { id },
      data: { orderId },
      include: bookingInclude,
    });
  },

  markPaymentFailed(id: string) {
    return prisma.booking.update({
      where: { id },
      data: { paymentStatus: 'FAILED' },
      include: bookingInclude,
    });
  },

  markPaymentPaid(
    id: string,
    data: {
      paymentId: string;
      orderId: string;
      amount: number;
      currency: string;
      paidAt: Date;
      paymentMethod: string;
    },
  ) {
    return prisma.booking.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        paymentId: data.paymentId,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        paidAt: data.paidAt,
        paymentMethod: data.paymentMethod,
      },
      include: bookingInclude,
    });
  },

  markPaymentRefunded(id: string) {
    return prisma.booking.update({
      where: { id },
      data: { paymentStatus: 'REFUNDED' },
      include: bookingInclude,
    });
  },

  updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
    return prisma.booking.update({
      where: { id },
      data: { paymentStatus },
      include: bookingInclude,
    });
  },
};