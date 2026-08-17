import { z } from 'zod';

export const plannerItemTypeEnum = z.enum(['HOTEL', 'RESTAURANT', 'DESTINATION', 'EXPERIENCE']);

export const plannerItemSchema = z.object({
  id: z.string().min(1, 'Item id is required'),
  type: plannerItemTypeEnum,
  refId: z.string().nullable().optional().default(null),
  name: z.string().trim().min(1, 'Item name is required').max(200),
  city: z.string().trim().max(120).optional().default(''),
  location: z.string().trim().max(300).optional().default(''),
  latitude: z.number().nullable().optional().default(null),
  longitude: z.number().nullable().optional().default(null),
  image: z.string().trim().max(1000).optional().default(''),
  price: z.number().nonnegative().optional().default(0),
  rating: z.number().nonnegative().optional().default(0),
  duration: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().max(120).optional().default(''),
  slug: z.string().trim().max(200).optional().default(''),
  href: z.string().trim().max(300).optional().default(''),
});

export const plannerDaySchema = z.object({
  id: z.string().min(1, 'Day id is required'),
  title: z.string().trim().max(160).optional().default(''),
  notes: z.string().trim().max(5000).optional().default(''),
  description: z.string().trim().max(5000).optional(),
  morning: z.string().trim().max(5000).optional(),
  afternoon: z.string().trim().max(5000).optional(),
  evening: z.string().trim().max(5000).optional(),
  estimatedDailyCost: z.string().trim().max(200).optional(),
  localTransportation: z.array(z.string().trim().max(300)).max(20).optional(),
  nearbyAttractions: z.array(z.string().trim().max(300)).max(20).optional(),
  hiddenGems: z.array(z.string().trim().max(300)).max(20).optional(),
  shopping: z.array(z.string().trim().max(300)).max(20).optional(),
  travelTips: z.array(z.string().trim().max(1000)).max(20).optional(),
  items: z.array(plannerItemSchema).max(30).default([]),
});

export const plannerDaysSchema = z.array(plannerDaySchema).min(1).max(30);

export const plannerPackingSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1).max(200),
      checked: z.boolean().default(false),
    }),
  )
  .max(200)
  .default([]);

export const createPlannerTripSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title is required').max(120),
    startDate: z.string().datetime().nullable().optional(),
    days: plannerDaysSchema.optional(),
    packing: plannerPackingSchema.optional(),
  }),
});

export const updatePlannerTripSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1, 'Title cannot be empty').max(120).optional(),
      startDate: z.string().datetime().nullable().optional(),
      days: plannerDaysSchema.optional(),
      packing: plannerPackingSchema.optional(),
    })
    .refine(
      (body) => body.title !== undefined || body.startDate !== undefined || body.days !== undefined || body.packing !== undefined,
      { message: 'Provide at least one field to update' },
    ),
});

export const optimizePlannerTripSchema = z.object({
  body: z.object({
    title: z.string().trim().max(120).optional().default('My Kerala Trip'),
    days: plannerDaysSchema,
  }),
});

export const plannerTripIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Trip id is required'),
  }),
});

export const shareCodeParamSchema = z.object({
  params: z.object({
    code: z.string().trim().min(4, 'Share code is required').max(16),
  }),
});

export type CreatePlannerTripInput = z.infer<typeof createPlannerTripSchema>['body'];
export type UpdatePlannerTripInput = z.infer<typeof updatePlannerTripSchema>['body'];
export type OptimizePlannerTripInput = z.infer<typeof optimizePlannerTripSchema>['body'];
