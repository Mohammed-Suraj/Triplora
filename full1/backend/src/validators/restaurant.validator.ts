import { z } from 'zod';

export const RESTAURANT_CATEGORIES = [
  'KERALA',
  'SEAFOOD',
  'VEGETARIAN',
  'CAFE',
  'FINE_DINING',
  'BAKERY',
  'FAST_FOOD',
] as const;

export const RESTAURANT_CRAVINGS = ['authentic', 'seafood', 'veg', 'quick', 'cozy', 'splurge'] as const;

const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Restaurant id is required') }),
});

const boolOptional = z.enum(['true', '1', 'false', '0']).optional();

export const listRestaurantsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    sortBy: z.enum(['price', 'rating', 'popularity']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    sort: z.string().max(30).optional(),
    q: z.string().max(100).optional(),
    category: z.enum([...RESTAURANT_CATEGORIES, 'ALL']).optional(),
    city: z.string().max(60).optional(),
    minPriceLevel: z.coerce.number().int().min(1).max(4).optional(),
    maxPriceLevel: z.coerce.number().int().min(1).max(4).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    all: boolOptional,
  }),
});

export const restaurantIdParamSchema = idParamSchema;

export const recommendRestaurantsQuerySchema = z.object({
  query: z.object({
    craving: z.enum(RESTAURANT_CRAVINGS).optional(),
    category: z.enum(RESTAURANT_CATEGORIES).optional(),
    city: z.string().max(60).optional(),
    limit: z.coerce.number().int().min(1).max(8).optional(),
  }),
});

export const createRestaurantSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    slug: z.string().min(1).max(120).optional(),
    tagline: z.string().max(200).default(''),
    description: z.string().max(2000).default(''),
    longDescription: z.string().max(6000).default(''),
    category: z.enum(RESTAURANT_CATEGORIES).default('KERALA'),
    cuisines: z.array(z.string().max(60)).max(10).default([]),
    priceRange: z.string().max(60).default(''),
    priceLevel: z.number().int().min(1).max(4).default(2),
    openingHours: z.string().max(120).default(''),
    phone: z.string().max(30).nullable().optional(),
    address: z.string().max(300).default(''),
    city: z.string().max(80).default(''),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    googleMapsUrl: z.string().url().max(500).optional(),
    rating: z.number().min(0).max(5).default(0),
    ratingNote: z.string().max(120).default('Sample rating'),
    popularityScore: z.number().int().min(0).default(0),
    bestFor: z.array(z.string().max(60)).max(12).default([]),
    image: z.string().max(500).optional(),
    gallery: z.array(z.string().max(500)).max(12).default([]),
    isActive: z.boolean().default(true),
  }),
});

export const updateRestaurantSchema = z.object({
  body: createRestaurantSchema.shape.body.partial(),
});
