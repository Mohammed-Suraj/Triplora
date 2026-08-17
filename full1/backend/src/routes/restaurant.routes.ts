import { Router } from 'express';
import { restaurantController } from '../controllers/restaurant.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import {
  listRestaurantsQuerySchema,
  restaurantIdParamSchema,
  recommendRestaurantsQuerySchema,
  createRestaurantSchema,
  updateRestaurantSchema,
} from '../validators/restaurant.validator';

const router = Router();

// NOTE: static paths must be registered before "/:id".
router.get('/recommend', validate(recommendRestaurantsQuerySchema), restaurantController.recommend);
router.get('/', validate(listRestaurantsQuerySchema), restaurantController.list);

// Restaurant management (admin-only)
router.post('/', requireAuth, requireRole('ADMIN'), uploadImage.single('image'), validate(createRestaurantSchema), restaurantController.create);
router.patch('/:id', requireAuth, requireRole('ADMIN'), uploadImage.single('image'), validate(updateRestaurantSchema), restaurantController.update);
router.delete('/:id', requireAuth, requireRole('ADMIN'), validate(restaurantIdParamSchema), restaurantController.remove);

router.get('/:id', validate(restaurantIdParamSchema), restaurantController.getById);

export default router;
