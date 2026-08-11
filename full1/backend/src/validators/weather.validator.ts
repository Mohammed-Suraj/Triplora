import { z } from 'zod';

export const weatherQuerySchema = z.object({
  query: z.object({
    latitude: z.coerce.number().min(-90).max(90, 'latitude must be between -90 and 90'),
    longitude: z.coerce.number().min(-180).max(180, 'longitude must be between -180 and 180'),
  }),
});
