import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';

const router = Router();

router.get('/', categoryController.list);

export default router;
