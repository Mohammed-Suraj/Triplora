import { Router } from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  getBookingByBookingId,
  cancelBooking,
  updateBookingStatus,
} from '../controllers/booking.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createBookingSchema, bookingIdParamSchema } from '../validators/booking.validator';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createBookingSchema), createBooking);
router.get('/', getUserBookings);
router.get('/:id', validate(bookingIdParamSchema), getBookingById);
router.get('/booking-id/:bookingId', getBookingByBookingId);
router.patch('/:id/cancel', validate(bookingIdParamSchema), cancelBooking);

// Admin-only routes
router.patch('/:id/status', requireRole('ADMIN'), updateBookingStatus);

export default router;
