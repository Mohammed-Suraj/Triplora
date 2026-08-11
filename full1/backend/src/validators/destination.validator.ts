import { z } from 'zod';

export const listDestinationsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.enum(['createdAt', 'rating', 'priceFrom', 'name', 'popularity', 'reviews']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    category: z.string().optional(),
    region: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
  }),
});

export const searchDestinationsSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(200),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  }),
});

export const smartSearchSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(200),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  }),
});

export const suggestSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Query is required').max(100),
  }),
});

export const destinationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Destination id is required'),
  }),
});

export const categoryParamSchema = z.object({
  params: z.object({
    category: z.string().min(1, 'Category is required'),
  }),
});

// Accepts either a JSON body or multipart/form-data (where numbers/arrays
// arrive as strings) so the same endpoint works from a JSON client or a
// multipart image-upload form.
const stringArray = z
  .union([z.array(z.string()), z.string()])
  .transform((val) => {
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [val];
    } catch {
      return val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  })
  .default([]);

export const createDestinationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    tagline: z.string().min(2).max(160),
    region: z.string().min(2).max(80),
    categoryId: z.string().min(1, 'categoryId is required'),
    priceFrom: z.coerce.number().int().nonnegative(),
    duration: z.string().min(1),
    bestSeason: z.string().min(1),
    description: z.string().min(10),
    longDescription: z.string().min(10),
    highlights: stringArray,
    activities: stringArray,
    gallery: stringArray,
    image: z.string().url().optional(),
    latitude: z.union([z.null(), z.coerce.number().min(-90).max(90)]).optional(),
    longitude: z.union([z.null(), z.coerce.number().min(-180).max(180)]).optional(),
  }),
});
