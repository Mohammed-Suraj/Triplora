import { Router } from 'express';
import { assistantController } from '../controllers/assistant.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { aiLimiter } from '../middlewares/rateLimiter.middleware';
import {
  assistantChatSchema,
  conversationIdParamSchema,
} from '../validators/assistant.validator';

const router = Router();

router.use(requireAuth);

router.post('/chat', aiLimiter, validate(assistantChatSchema), assistantController.chat);
router.get('/conversations', assistantController.listConversations);
router.get('/conversations/:id', validate(conversationIdParamSchema), assistantController.getConversation);
router.delete('/conversations/:id', validate(conversationIdParamSchema), assistantController.removeConversation);

export default router;
