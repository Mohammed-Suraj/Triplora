import { Router } from 'express';
import { destinationController } from '../controllers/destination.controller';
import { reviewController } from '../controllers/review.controller';
import { smartSearchController } from '../controllers/smartSearch.controller';
import { validate } from '../middlewares/validate.middleware';
import { requireAuth, requireRole, optionalAuth } from '../middlewares/auth.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import { searchLimiter } from '../middlewares/rateLimiter.middleware';
import {
  categoryParamSchema,
  createDestinationSchema,
  destinationIdParamSchema,
  listDestinationsSchema,
  searchDestinationsSchema,
  smartSearchSchema,
  suggestSchema,
} from '../validators/destination.validator';
import { listReviewsByDestinationSchema } from '../validators/review.validator';

const router = Router();

// NOTE: specific paths ("/search", "/category/:category") must be registered
// before the "/:id" catch-all to avoid being shadowed by it.
router.get('/smart-search', searchLimiter, optionalAuth, validate(smartSearchSchema), smartSearchController.search);
router.get('/suggest', searchLimiter, optionalAuth, validate(suggestSchema), smartSearchController.suggest);
router.get('/search', searchLimiter, validate(searchDestinationsSchema), destinationController.search);
router.get('/category/:category', validate(categoryParamSchema), destinationController.byCategory);
router.get('/', validate(listDestinationsSchema), destinationController.list);

// Admin-only: create a new destination (multipart/form-data with optional "image" file).
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  uploadImage.single('image'),
  validate(createDestinationSchema),
  destinationController.create,
);

router.get('/:id', validate(destinationIdParamSchema), destinationController.getById);

// Nested resource: reviews for a given destination
router.get(
  '/:destinationId/reviews',
  optionalAuth,
  validate(listReviewsByDestinationSchema),
  reviewController.listByDestination,
);

export default router;
