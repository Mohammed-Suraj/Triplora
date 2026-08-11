import { Router } from 'express';
import { groqController } from '../controllers/groq.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { aiLimiter } from '../middlewares/rateLimiter.middleware';
import { createAiTripPlanSchema, naturalTripPlanSchema } from '../validators/groq.validator';

const router = Router();

// Every AI route requires an authenticated user and is rate limited.
router.use(requireAuth);
router.use(aiLimiter);

router.post('/trip-plan', validate(createAiTripPlanSchema), groqController.generateTripPlan);
router.post('/trip-plan/natural', validate(naturalTripPlanSchema), groqController.naturalTripPlan);

export default router;