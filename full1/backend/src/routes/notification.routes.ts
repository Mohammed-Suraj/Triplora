import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { notificationIdParamSchema, listNotificationsSchema } from '../validators/notification.validator';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listNotificationsSchema), notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', validate(notificationIdParamSchema), notificationController.markRead);

export default router;
