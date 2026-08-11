import { z } from 'zod';

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Notification id is required'),
  }),
});
