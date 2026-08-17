import { Router } from 'express';
import { plannerTripController } from '../controllers/plannerTrip.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { aiLimiter } from '../middlewares/rateLimiter.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createPlannerTripSchema,
  optimizePlannerTripSchema,
  plannerTripIdParamSchema,
  shareCodeParamSchema,
  updatePlannerTripSchema,
} from '../validators/plannerTrip.validator';

const router = Router();

// Public - shared trip view (no auth).
router.get('/share/:code', validate(shareCodeParamSchema), plannerTripController.getShared);

router.use(requireAuth);

router.post('/optimize-ai', aiLimiter, validate(optimizePlannerTripSchema), plannerTripController.optimizeAi);
router.get('/', plannerTripController.list);
router.post('/', validate(createPlannerTripSchema), plannerTripController.create);
router.get('/:id', validate(plannerTripIdParamSchema), plannerTripController.getById);
router.patch('/:id', validate(updatePlannerTripSchema), plannerTripController.update);
router.delete('/:id', validate(plannerTripIdParamSchema), plannerTripController.remove);
router.post('/:id/duplicate', validate(plannerTripIdParamSchema), plannerTripController.duplicate);
router.post('/:id/share', validate(plannerTripIdParamSchema), plannerTripController.generateShareCode);

export default router;
