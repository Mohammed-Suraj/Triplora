import type { Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import { uploadService } from '../services/upload.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  return req.user;
}

export const reviewController = {
  listByDestination: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta, stats } = await reviewService.listByDestination(
      req.params.destinationId,
      req.query as Record<string, string>,
      req.user?.sub,
    );
    res.status(200).json(new ApiResponse('Reviews fetched successfully', { items, stats }, meta));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const { destinationId, rating, comment, images } = req.body;
    const review = await reviewService.create(user.sub, destinationId, rating, comment, images ?? []);
    res.status(201).json(new ApiResponse('Review submitted successfully', review));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    await reviewService.remove(user.sub, req.params.id, user.role);
    res.status(200).json(new ApiResponse('Review deleted successfully', null));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const { rating, comment, images } = req.body;
    const review = await reviewService.update(user.sub, req.params.id, user.role, rating, comment, images);
    res.status(200).json(new ApiResponse('Review updated successfully', review));
  }),

  toggleLike: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const result = await reviewService.toggleLike(user.sub, req.params.id);
    res.status(200).json(new ApiResponse('Review like updated', result));
  }),

  report: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    await reviewService.report(user.sub, req.params.id, req.body.reason);
    res.status(201).json(new ApiResponse('Review reported successfully', null));
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await reviewService.statsForDestination(req.params.destinationId);
    res.status(200).json(new ApiResponse('Review statistics fetched successfully', stats));
  }),

  /** Uploads a review image to Cloudinary and returns its URL. */
  uploadImage: asyncHandler(async (req: Request, res: Response) => {
    requireUser(req);
    if (!req.file) {
      throw ApiError.badRequest('An image file is required');
    }
    const url = await uploadService.uploadImageBuffer(req.file.buffer, 'triplora/reviews', {
      baseUrl: `${req.protocol}://${req.get('host')}`,
      originalName: req.file.originalname,
    });
    res.status(201).json(new ApiResponse('Image uploaded successfully', { url }));
  }),
};
