import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAdmin } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  adminIdParamSchema,
  createAnnouncementSchema,
  listAdminSchema,
  listEmailLogsSchema,
  listReviewReportsSchema,
  updateBookingStatusSchema,
  updateContactStatusSchema,
  updateDestinationSchema,
  updateReportStatusSchema,
  updateUserRoleSchema,
} from '../validators/admin.validator';

const router = Router();

// Every route below requires a valid ADMIN JWT (401 if unauthenticated, 403 if not ADMIN).
router.use(requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/users', validate(listAdminSchema), adminController.listUsers);
router.patch('/users/:id/role', validate(updateUserRoleSchema), adminController.updateUserRole);
router.delete('/users/:id', validate(adminIdParamSchema), adminController.deleteUser);
router.get('/destinations', validate(listAdminSchema), adminController.listDestinations);
router.patch('/destinations/:id', validate(updateDestinationSchema), adminController.updateDestination);
router.delete('/destinations/:id', validate(adminIdParamSchema), adminController.deleteDestination);
router.get('/bookings', validate(listAdminSchema), adminController.listBookings);
router.patch(
  '/bookings/:id/status',
  validate(updateBookingStatusSchema),
  adminController.updateBookingStatus,
);
router.delete('/bookings/:id', validate(adminIdParamSchema), adminController.deleteBooking);
router.get('/reviews', validate(listAdminSchema), adminController.listReviews);
router.delete('/reviews/:id', validate(adminIdParamSchema), adminController.deleteReview);
router.get('/review-reports', validate(listReviewReportsSchema), adminController.listReviewReports);
router.patch(
  '/review-reports/:id/status',
  validate(updateReportStatusSchema),
  adminController.updateReportStatus,
);
router.post('/announcements', validate(createAnnouncementSchema), adminController.createAnnouncement);
router.get('/contact-messages', validate(listAdminSchema), adminController.listContactMessages);
router.patch(
  '/contact-messages/:id/status',
  validate(updateContactStatusSchema),
  adminController.updateContactStatus,
);
router.delete('/contact-messages/:id', validate(adminIdParamSchema), adminController.deleteContactMessage);
router.get('/email-logs', validate(listEmailLogsSchema), adminController.listEmailLogs);

// Analytics
router.get('/analytics/overview', adminController.analyticsOverview);
router.get('/analytics/booking-growth', adminController.analyticsBookingGrowth);
router.get('/analytics/popular-destinations', adminController.analyticsPopularDestinations);
router.get('/analytics/trending', adminController.analyticsTrending);
router.get('/analytics/searches', adminController.analyticsTopSearches);
router.get('/analytics/ai-usage', adminController.analyticsAiUsage);
router.get('/analytics/destination-performance', adminController.analyticsDestinationPerformance);
router.get('/analytics/monthly-report', adminController.analyticsMonthlyReport);

export default router;
