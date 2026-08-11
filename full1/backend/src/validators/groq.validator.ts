import { z } from 'zod';

// Optional fields must accept null / undefined / empty string - never "Expected string, received null".
export const createAiTripPlanSchema = z.object({
  body: z.object({
    budget: z.enum(['RELAXED', 'PREMIUM', 'LUXURY']),
    days: z.number().int().min(1).max(30),
    travelStyle: z.enum(['ROMANTIC', 'FAMILY', 'SOLO', 'FRIENDS']),
    interests: z
      .preprocess((value) => (value == null || value === '' ? [] : value), z.array(z.string().trim()).max(12))
      .transform((items) => items.filter((item) => item.length > 0)),
    // Optional destination: a catalog destination name or any free-text place.
    // Accepts null, undefined and empty string (treated as "no destination").
    destination: z.preprocess(
      (value) => (value == null || value === '' ? undefined : value),
      z.string().trim().min(1).max(120).optional(),
    ),
  }),
});

export const naturalTripPlanSchema = z.object({
  body: z.object({
    prompt: z.string().trim().min(3).max(2000),
  }),
});