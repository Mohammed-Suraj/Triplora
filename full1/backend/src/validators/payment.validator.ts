import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'bookingId is required'),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'bookingId is required'),
    razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
    razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
    razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
  }),
});

export const retryPaymentSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'bookingId is required'),
  }),
});

export const paymentBookingIdParamSchema = z.object({
  params: z.object({
    bookingId: z.string().min(1, 'bookingId is required'),
  }),
});