import { z } from 'zod';

export const budgetEnum = z.enum(['RELAXED', 'PREMIUM', 'LUXURY']);
export const travelStyleEnum = z.enum(['ROMANTIC', 'FAMILY', 'SOLO', 'FRIENDS']);

export const createTripPlanSchema = z.object({
  body: z.object({
    title: z.string().max(120).optional(),
    budget: budgetEnum.default('RELAXED'),
    days: z.number({ required_error: 'days is required' }).int().min(1).max(30),
    travelStyle: travelStyleEnum.default('SOLO'),
    interests: z.array(z.string()).default([]),
  }),
});

// Save a complete AI-generated itinerary (payload = the full AI JSON response).
export const saveTripPlanSchema = z.object({
  body: z.object({
    title: z.string().max(120).optional(),
    budget: budgetEnum.default('RELAXED'),
    days: z.number({ required_error: 'days is required' }).int().min(1).max(30),
    travelStyle: travelStyleEnum.default('SOLO'),
    interests: z.array(z.string()).default([]),
    payload: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, {
      message: 'payload is required',
    }),
  }),
});

export const updateTripPlanSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(120).optional(),
  }),
});

export const chatTripPlanSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1, 'Message is required').max(2000),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().max(4000),
        }),
      )
      .max(20)
      .default([]),
  }),
});

export const tripPlanIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Trip plan id is required'),
  }),
});

export type CreateTripPlanInput = z.infer<typeof createTripPlanSchema>['body'];
export type SaveTripPlanInput = z.infer<typeof saveTripPlanSchema>['body'];
export type UpdateTripPlanInput = z.infer<typeof updateTripPlanSchema>['body'];
export type ChatTripPlanInput = z.infer<typeof chatTripPlanSchema>['body'];