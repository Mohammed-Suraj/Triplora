import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    destinationId: z.string().min(1, 'destinationId is required'),
    rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
    comment: z.string().min(3, 'Comment must be at least 3 characters').max(1000),
    images: z.array(z.string().url('Image must be a valid URL').max(500)).max(6).optional().default([]),
  }),
});

export const reviewIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Review id is required'),
  }),
});

export const updateReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Review id is required'),
  }),
  body: z.object({
    rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5').optional(),
    comment: z.string().min(3, 'Comment must be at least 3 characters').max(1000).optional(),
    images: z.array(z.string().url('Image must be a valid URL').max(500)).max(6).optional(),
  }),
});

export const reportReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Review id is required'),
  }),
  body: z.object({
    reason: z.string().min(3, 'Please provide a reason (at least 3 characters)').max(500),
  }),
});

export const listReviewsByDestinationSchema = z.object({
  params: z.object({
    destinationId: z.string().min(1),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
