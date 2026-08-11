import type { Request, Response } from 'express';
import { destinationService } from '../services/destination.service';
import { uploadService } from '../services/upload.service';
import { analyticsLogService } from '../services/analyticsLog.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const destinationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await destinationService.list(req.query as Record<string, string>);
    res.status(200).json(new ApiResponse('Destinations fetched successfully', items, meta));
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query.q as string;
    void analyticsLogService.logSearch(q, req.user?.sub);
    const { items, meta } = await destinationService.search(q, req.query as Record<string, string>);
    res.status(200).json(new ApiResponse('Search results fetched successfully', items, meta));
  }),

  byCategory: asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.params;
    const { items, meta } = await destinationService.byCategory(category, req.query as Record<string, string>);
    res.status(200).json(new ApiResponse(`Destinations in "${category}" fetched successfully`, items, meta));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const destination = await destinationService.getById(req.params.id);
    res.status(200).json(new ApiResponse('Destination fetched successfully', destination));
  }),

  // Admin-only: create a destination, optionally uploading a cover image to Cloudinary.
  create: asyncHandler(async (req: Request, res: Response) => {
    let imageUrl = req.body.image as string | undefined;

    if (req.file) {
      imageUrl = await uploadService.uploadImageBuffer(req.file.buffer, 'triplora/destinations', {
        baseUrl: `${req.protocol}://${req.get('host')}`,
        originalName: req.file.originalname,
      });
    }

    if (!imageUrl) {
      throw ApiError.badRequest('An image file or image URL is required');
    }

    const destination = await destinationService.create({ ...req.body, image: imageUrl });
    res.status(201).json(new ApiResponse('Destination created successfully', destination));
  }),
};
