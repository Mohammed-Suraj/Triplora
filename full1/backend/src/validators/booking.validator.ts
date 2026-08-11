import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    destinationId: z.string().min(1, 'Destination is required'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    phone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number format'),
    numberOfTravelers: z
      .number()
      .int()
      .min(1, 'At least 1 traveler is required')
      .max(100, 'Maximum 100 travelers'),
    travelDate: z
      .string()
      .refine(
        (val) => {
          const date = new Date(val);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return !isNaN(date.getTime()) && date >= today;
        },
        { message: 'Travel date cannot be in the past' },
      ),
    returnDate: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: 'Invalid return date' },
      ),
    budget: z.number().positive('Budget must be greater than 0'),
    specialRequests: z.string().max(1000, 'Special requests must be under 1000 characters').optional(),
  }),
});

export const bookingIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Booking id is required'),
  }),
});

export const listBookingsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
    search: z.string().optional(),
    sort: z.enum(['newest', 'oldest', 'travelDate']).optional(),
  }),
});
