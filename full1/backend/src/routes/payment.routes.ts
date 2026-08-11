import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createOrderSchema,
  paymentBookingIdParamSchema,
  retryPaymentSchema,
  verifyPaymentSchema,
} from '../validators/payment.validator';

const router = Router();

// Every payment route requires an authenticated user.
router.use(requireAuth);

router.post('/create-order', validate(createOrderSchema), paymentController.createOrder);
router.post('/verify', validate(verifyPaymentSchema), paymentController.verifyPayment);
router.post('/retry', validate(retryPaymentSchema), paymentController.retryPayment);
router.get('/:bookingId', validate(paymentBookingIdParamSchema), paymentController.getPayment);

export default router;