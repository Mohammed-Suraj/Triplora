import { Router } from 'express';
import { contactController } from '../controllers/contact.controller';
import { validate } from '../middlewares/validate.middleware';
import { createContactMessageSchema } from '../validators/contact.validator';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { reviewLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.post('/', reviewLimiter, validate(createContactMessageSchema), contactController.create);

// Admin-only: view submitted contact messages
router.get('/', requireAuth, requireRole('ADMIN'), contactController.list);

export default router;
