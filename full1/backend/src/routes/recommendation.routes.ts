import { Router } from 'express';
import { recommendationController } from '../controllers/recommendation.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', optionalAuth, recommendationController.list);

export default router;
