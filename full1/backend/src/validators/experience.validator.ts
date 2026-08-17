import { z } from 'zod';

export const EXPERIENCE_CATEGORIES = [
  'ADVENTURE',
  'CULTURE',
  'WILDLIFE',
  'FOOD',
  'WELLNESS',
  'NATURE',
  'WATER_ACTIVITIES',
] as const;

export const EXPERIENCE_DIFFICULTIES = ['EASY', 'MODERATE', 'CHALLENGING'] as const;

const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Experience id is required') }),
});

const boolOptional = z.enum(['true', '1', 'false', '0']).optional();

export const listExperiencesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    sortBy: z.enum(['price', 'rating', 'popularity']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    sort: z.string().max(30).optional(),
    q: z.string().max(100).optional(),
    category: z.enum([...EXPERIENCE_CATEGORIES, 'ALL']).optional(),
    city: z.string().max(60).optional(),
    difficulty: z.enum([...EXPERIENCE_DIFFICULTIES, 'ALL']).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    all: boolOptional,
  }),
});

export const experienceIdParamSchema = idParamSchema;

export const createExperienceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(140),
    slug: z.string().min(1).max(140).optional(),
    tagline: z.string().max(200).default(''),
    description: z.string().max(2000).default(''),
    longDescription: z.string().max(6000).default(''),
    category: z.enum(EXPERIENCE_CATEGORIES).default('NATURE'),
    duration: z.string().max(80).default(''),
    price: z.number().int().min(0).default(0),
    location: z.string().max(300).default(''),
    city: z.string().max(80).default(''),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    difficulty: z.enum(EXPERIENCE_DIFFICULTIES).default('EASY'),
    bestSeason: z.string().max(80).default(''),
    suitableFor: z.array(z.string().max(30)).max(8).default([]),
    highlights: z.array(z.string().max(120)).max(12).default([]),
    rating: z.number().min(0).max(5).default(0),
    ratingNote: z.string().max(120).default('Sample rating'),
    popularityScore: z.number().int().min(0).default(0),
    isFeatured: z.boolean().default(false),
    image: z.string().max(500).optional(),
    gallery: z.array(z.string().max(500)).max(12).default([]),
    isActive: z.boolean().default(true),
  }),
});

export const updateExperienceSchema = z.object({
  body: createExperienceSchema.shape.body.partial(),
});