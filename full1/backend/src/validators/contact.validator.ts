import { z } from 'zod';

export const createContactMessageSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().toLowerCase().email('Provide a valid email address'),
    phone: z.string().trim().max(20).optional(),
    subject: z.string().trim().max(150).optional(),
    message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
  }),
});
