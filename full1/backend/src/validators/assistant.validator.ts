import { z } from 'zod';

export const assistantChatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required').max(2000),
    conversationId: z.string().min(1).max(64).optional().nullable(),
  }),
});

export const conversationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Conversation id is required'),
  }),
});
