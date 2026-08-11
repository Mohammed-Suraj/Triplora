import type { Request, Response } from 'express';
import { wishlistService } from '../services/wishlist.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

function requireUserId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  return req.user.sub;
}

export const wishlistController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const items = await wishlistService.list(userId);
    res.status(200).json(new ApiResponse('Wishlist fetched successfully', items));
  }),

  add: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const entry = await wishlistService.add(userId, req.body.destinationId);
    res.status(201).json(new ApiResponse('Destination added to wishlist', entry));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    await wishlistService.remove(userId, req.params.id);
    res.status(200).json(new ApiResponse('Destination removed from wishlist', null));
  }),
};
