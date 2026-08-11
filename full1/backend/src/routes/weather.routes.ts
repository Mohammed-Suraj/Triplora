import { Router } from 'express';
import { weatherController } from '../controllers/weather.controller';
import { validate } from '../middlewares/validate.middleware';
import { weatherQuerySchema } from '../validators/weather.validator';

const router = Router();

router.get('/', validate(weatherQuerySchema), weatherController.get);

export default router;
