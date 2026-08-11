import { Router } from 'express';
import { tripPlanController } from '../controllers/tripPlan.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  chatTripPlanSchema,
  createTripPlanSchema,
  saveTripPlanSchema,
  tripPlanIdParamSchema,
  updateTripPlanSchema,
} from '../validators/tripPlan.validator';

const router = Router();

router.use(requireAuth);

router.post('/save', validate(saveTripPlanSchema), tripPlanController.save);
router.post('/', validate(createTripPlanSchema), tripPlanController.create);
router.get('/', tripPlanController.list);
router.get('/:id', validate(tripPlanIdParamSchema), tripPlanController.getById);
router.patch('/:id', validate(updateTripPlanSchema), tripPlanController.updateTitle);
router.post('/:id/duplicate', validate(tripPlanIdParamSchema), tripPlanController.duplicate);
router.post('/:id/chat', validate(chatTripPlanSchema), tripPlanController.chat);
router.delete('/:id', validate(tripPlanIdParamSchema), tripPlanController.remove);

export default router;