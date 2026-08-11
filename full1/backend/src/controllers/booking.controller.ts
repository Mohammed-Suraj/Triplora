import type { Response } from 'express';
import { bookingService } from '../services/booking.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const createBooking = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const booking = await bookingService.createBooking({
    ...req.body,
    userId,
  });
  res.status(201).json(new ApiResponse('Booking created successfully', booking));
});

export const getUserBookings = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { status } = req.query as { status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' };
  const bookings = await bookingService.listUserBookings(userId, status);
  res.json(new ApiResponse('Bookings retrieved successfully', bookings));
});

export const getBookingById = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const booking = await bookingService.getBookingById(req.params.id, userId);
  res.json(new ApiResponse('Booking retrieved successfully', booking));
});

export const getBookingByBookingId = asyncHandler(async (req, res: Response) => {
  const booking = await bookingService.getBookingByBookingId(req.params.bookingId);
  res.json(new ApiResponse('Booking retrieved successfully', booking));
});

export const cancelBooking = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const booking = await bookingService.cancelBooking(req.params.id, userId);
  res.json(new ApiResponse('Booking cancelled successfully', booking));
});

export const updateBookingStatus = asyncHandler(async (req, res: Response) => {
  const { status } = req.body as { status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' };
  const booking = await bookingService.updateBookingStatus(req.params.id, status);
  res.json(new ApiResponse('Booking status updated successfully', booking));
});
