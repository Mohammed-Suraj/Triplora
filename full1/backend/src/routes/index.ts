import { Router } from 'express';
import authRoutes from './auth.routes';
import destinationRoutes from './destination.routes';
import categoryRoutes from './category.routes';
import wishlistRoutes from './wishlist.routes';
import tripPlanRoutes from './tripPlan.routes';
import reviewRoutes from './review.routes';
import contactRoutes from './contact.routes';
import bookingRoutes from './booking.routes';
import paymentRoutes from './payment.routes';
import groqRoutes from './groq.routes';
import weatherRoutes from './weather.routes';
import adminRoutes from './admin.routes';
import assistantRoutes from './assistant.routes';
import notificationRoutes from './notification.routes';
import recommendationRoutes from './recommendation.routes';
import hotelRoutes from './hotel.routes';
import restaurantRoutes from './restaurant.routes';
import experienceRoutes from './experience.routes';
import plannerTripRoutes from './plannerTrip.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Triplora API is healthy' });
});

router.use('/auth', authRoutes);
router.use('/destinations', destinationRoutes);
router.use('/categories', categoryRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/trip-plan', tripPlanRoutes);
router.use('/reviews', reviewRoutes);
router.use('/contact', contactRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/ai/assistant', assistantRoutes);
router.use('/ai', groqRoutes);
router.use('/weather', weatherRoutes);
router.use('/notifications', notificationRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/hotels', hotelRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/experiences', experienceRoutes);
router.use('/planner', plannerTripRoutes);
router.use('/admin', adminRoutes);

export default router;
