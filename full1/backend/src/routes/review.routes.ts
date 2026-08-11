import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import { reviewLimiter } from '../middlewares/rateLimiter.middleware';
import {
  createReviewSchema,
  reportReviewSchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from '../validators/review.validator';

const router = Router();

router.post(
  '/',
  requireAuth,
  reviewLimiter,
  validate(createReviewSchema),
  reviewController.create,
);
router.post(
  '/upload',
  requireAuth,
  reviewLimiter,
  uploadImage.single('image'),
  reviewController.uploadImage,
);
router.patch('/:id', requireAuth, validate(updateReviewSchema), reviewController.update);
router.delete('/:id', requireAuth, validate(reviewIdParamSchema), reviewController.remove);
router.post('/:id/like', requireAuth, validate(reviewIdParamSchema), reviewController.toggleLike);
router.post(
  '/:id/report',
  requireAuth,
  reviewLimiter,
  validate(reportReviewSchema),
  reviewController.report,
);

// Public review statistics for a destination
router.get('/stats/:destinationId', reviewController.stats);

export default router;
