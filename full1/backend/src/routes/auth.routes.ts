import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { requireAuth } from '../middlewares/auth.middleware';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  emailPreferencesSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/profile', requireAuth, authController.profile);
router.put('/profile', requireAuth, validate(updateProfileSchema), authController.updateProfile);
router.post('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);
router.get('/email-preferences', requireAuth, authController.getEmailPreferences);
router.put('/email-preferences', requireAuth, validate(emailPreferencesSchema), authController.updateEmailPreferences);
router.post('/verify-email', authRateLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post('/forgot-password', authRateLimiter, validate(requestPasswordResetSchema), authController.requestPasswordReset);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

export default router;
