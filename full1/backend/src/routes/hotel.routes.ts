import { Router } from 'express';
import { hotelController } from '../controllers/hotel.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import {
  createHotelBookingSchema,
  createHotelReviewSchema,
  createHotelSchema,
  createRoomSchema,
  hotelIdParamSchema,
  hotelReviewIdParamSchema,
  hotelReviewParamsSchema,
  listHotelBookingsQuerySchema,
  listHotelReviewsQuerySchema,
  listHotelsQuerySchema,
  recommendHotelsQuerySchema,
  roomIdParamSchema,
  updateHotelBookingStatusSchema,
  updateHotelReviewSchema,
  updateHotelSchema,
  updateRoomSchema,
} from '../validators/hotel.validator';

const router = Router();

// NOTE: static paths must be registered before "/:id".
router.get('/recommend', validate(recommendHotelsQuerySchema), hotelController.recommend);
router.get('/destination/:destinationId', validate(listHotelsQuerySchema), hotelController.byDestination);
router.get('/', validate(listHotelsQuerySchema), hotelController.list);

// Hotel management (admin-only)
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  uploadImage.single('image'),
  validate(createHotelSchema),
  hotelController.create,
);
router.post(
  '/upload',
  requireAuth,
  requireRole('ADMIN'),
  uploadImage.single('image'),
  hotelController.uploadImage,
);
router.patch('/:id', requireAuth, requireRole('ADMIN'), uploadImage.single('image'), validate(updateHotelSchema), hotelController.update);
router.delete('/:id', requireAuth, requireRole('ADMIN'), validate(hotelIdParamSchema), hotelController.remove);

// Rooms (admin-only)
router.post('/:id/rooms', requireAuth, requireRole('ADMIN'), validate(createRoomSchema), hotelController.createRoom);
router.patch('/rooms/:id', requireAuth, requireRole('ADMIN'), validate(updateRoomSchema), hotelController.updateRoom);
router.delete('/rooms/:id', requireAuth, requireRole('ADMIN'), validate(roomIdParamSchema), hotelController.removeRoom);

// Bookings
router.get('/bookings/mine', requireAuth, hotelController.myBookings);
router.get('/bookings/booking-id/:bookingId', requireAuth, hotelController.getBookingByBookingId);
router.get('/bookings/admin', requireAuth, requireRole('ADMIN'), validate(listHotelBookingsQuerySchema), hotelController.adminBookings);
router.post('/:id/book', requireAuth, validate(createHotelBookingSchema), hotelController.createBooking);
router.patch('/bookings/:id/cancel', requireAuth, validate(hotelIdParamSchema), hotelController.cancelBooking);
router.patch(
  '/bookings/:id/status',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateHotelBookingStatusSchema),
  hotelController.updateBookingStatus,
);

// Reviews
router.get('/:id/reviews', validate(listHotelReviewsQuerySchema), hotelController.listReviews);
router.post('/:id/reviews', requireAuth, validate(createHotelReviewSchema), hotelController.createReview);
router.patch('/:id/reviews/:reviewId', requireAuth, validate(hotelReviewParamsSchema), hotelController.updateReview);
router.delete('/:id/reviews/:reviewId', requireAuth, validate(hotelReviewParamsSchema), hotelController.removeReview);

router.get('/:id', validate(hotelIdParamSchema), hotelController.getById);

export default router;
