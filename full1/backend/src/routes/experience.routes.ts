import { Router } from 'express';
import { experienceController } from '../controllers/experience.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import {
  listExperiencesQuerySchema,
  experienceIdParamSchema,
  createExperienceSchema,
  updateExperienceSchema,
} from '../validators/experience.validator';

const router = Router();

router.get('/', validate(listExperiencesQuerySchema), experienceController.list);

// Experience management (admin-only)
router.post('/', requireAuth, requireRole('ADMIN'), uploadImage.single('image'), validate(createExperienceSchema), experienceController.create);
router.patch('/:id', requireAuth, requireRole('ADMIN'), uploadImage.single('image'), validate(updateExperienceSchema), experienceController.update);
router.delete('/:id', requireAuth, requireRole('ADMIN'), validate(experienceIdParamSchema), experienceController.remove);

router.get('/:id', validate(experienceIdParamSchema), experienceController.getById);

export default router;