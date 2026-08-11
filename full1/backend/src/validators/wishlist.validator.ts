import { z } from 'zod';

export const addToWishlistSchema = z.object({
  body: z.object({
    destinationId: z.string().min(1, 'destinationId is required'),
  }),
});

export const wishlistIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Wishlist id is required'),
  }),
});
