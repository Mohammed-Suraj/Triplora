import { bookingRepository } from '../repositories/booking.repository';
import { userRepository } from '../repositories/user.repository';
import { ApiError } from '../utils/ApiError';
import crypto from 'node:crypto';
import { env } from '../config/env';
import { emailService, prefsOf } from './email.service';
import { notificationService } from './notification.service';
import type { BookingStatus } from '@prisma/client';

function generateBookingId(): string {
  const prefix = 'TRP';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const bookingService = {
  listUserBookings: async (userId: string, status?: BookingStatus) => {
    const where: { userId: string; status?: BookingStatus } = { userId };
    if (status) where.status = status;
    return bookingRepository.findMany(where);
  },

  getBookingById: async (id: string, userId: string) => {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new ApiError(404, 'Booking not found');
    if (booking.userId !== userId) throw new ApiError(403, 'Not authorized to view this booking');
    return booking;
  },

  getBookingByBookingId: async (bookingId: string) => {
    const booking = await bookingRepository.findByBookingId(bookingId);
    if (!booking) throw new ApiError(404, 'Booking not found');
    return booking;
  },

  createBooking: async (data: {
    destinationId: string;
    fullName: string;
    email: string;
    phone: string;
    numberOfTravelers: number;
    travelDate: string;
    returnDate?: string;
    budget: number;
    specialRequests?: string;
    userId: string;
  }) => {
    const travelDate = new Date(data.travelDate);
    if (isNaN(travelDate.getTime())) throw new ApiError(400, 'Invalid travel date');

    const returnDate = data.returnDate ? new Date(data.returnDate) : undefined;
    if (returnDate && isNaN(returnDate.getTime())) throw new ApiError(400, 'Invalid return date');

    // Check for duplicate booking
    const existing = await bookingRepository.findDuplicate(data.userId, data.destinationId, travelDate);
    if (existing) {
      throw new ApiError(409, 'You already have a booking for this destination on the selected date');
    }

    const bookingId = generateBookingId();

    const booking = await bookingRepository.create({
      bookingId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      numberOfTravelers: data.numberOfTravelers,
      travelDate,
      returnDate,
      budget: data.budget,
      specialRequests: data.specialRequests,
      userId: data.userId,
      destinationId: data.destinationId,
    });

    const user = await userRepository.findById(data.userId).catch(() => null);
    emailService.sendBookingConfirmationEmail(
      booking.email,
      {
        name: booking.fullName,
        bookingId: booking.bookingId,
        destinationName: booking.destination.name,
        region: booking.destination.region ?? 'Kerala',
        travelDate: booking.travelDate,
        returnDate: booking.returnDate,
        numberOfTravelers: booking.numberOfTravelers,
        fullName: booking.fullName,
        email: booking.email,
        phone: booking.phone,
        budget: booking.budget,
        currency: 'INR',
        bookingStatus: booking.status,
        paymentStatus: booking.paymentStatus,
        bookingUrl: `${env.email.frontendUrl}/bookings/${booking.id}`,
      },
      user ? prefsOf(user) : null,
    );

    void notificationService.create(
      data.userId,
      'BOOKING_CONFIRMED',
      'Booking confirmed',
      `Your booking ${booking.bookingId} for ${booking.destination.name} is confirmed.`,
      `/bookings/${booking.id}`,
    );

    return booking;
  },

  cancelBooking: async (id: string, userId: string) => {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new ApiError(404, 'Booking not found');
    if (booking.userId !== userId) throw new ApiError(403, 'Not authorized to cancel this booking');
    if (booking.status === 'CANCELLED') throw new ApiError(400, 'Booking is already cancelled');
    if (booking.status === 'COMPLETED') throw new ApiError(400, 'Cannot cancel a completed booking');

    const updated = await bookingRepository.updateStatus(id, 'CANCELLED');

    const wasPaid = booking.paymentStatus === 'PAID';
    const refundStatus = wasPaid
      ? 'Refund will be initiated to your original payment method within 5-7 business days'
      : 'No payment was made for this booking';

    const user = await userRepository.findById(updated.userId).catch(() => null);
    emailService.sendBookingCancelledEmail(
      updated.email,
      {
        name: updated.fullName,
        bookingId: updated.bookingId,
        destinationName: updated.destination.name,
        travelDate: updated.travelDate,
        refundStatus,
        refundAmount: wasPaid ? (booking.amount ?? booking.budget) : 0,
        currency: booking.currency ?? 'INR',
        bookingUrl: `${env.email.frontendUrl}/explore`,
      },
      user ? prefsOf(user) : null,
    );

    void notificationService.create(
      updated.userId,
      'BOOKING_CANCELLED',
      'Booking cancelled',
      `Booking ${updated.bookingId} for ${updated.destination.name} has been cancelled.`,
      `/bookings/${updated.id}`,
    );

    return updated;
  },

  updateBookingStatus: async (id: string, status: BookingStatus) => {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw new ApiError(404, 'Booking not found');

    return bookingRepository.updateStatus(id, status);
  },
};
