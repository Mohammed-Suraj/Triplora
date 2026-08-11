import { Router } from 'express';
import { wishlistController } from '../controllers/wishlist.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { addToWishlistSchema, wishlistIdParamSchema } from '../validators/wishlist.validator';

const router = Router();

router.use(requireAuth);

router.get('/', wishlistController.list);
router.post('/', validate(addToWishlistSchema), wishlistController.add);
router.delete('/:id', validate(wishlistIdParamSchema), wishlistController.remove);

export default router;
