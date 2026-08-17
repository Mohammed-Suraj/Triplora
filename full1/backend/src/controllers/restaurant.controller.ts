import type { Request, Response } from 'express';
import { restaurantService } from '../services/restaurant.service';
import { uploadService } from '../services/upload.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const restaurantController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await restaurantService.list(req.query as Record<string, string>);
    res.status(200).json(new ApiResponse('Restaurants fetched successfully', items, meta));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.getByIdOrSlug(req.params.id);
    res.status(200).json(new ApiResponse('Restaurant fetched successfully', restaurant));
  }),

  recommend: asyncHandler(async (req: Request, res: Response) => {
    const items = await restaurantService.recommend({
      craving: req.query.craving as string | undefined,
      category: req.query.category as string | undefined,
      city: req.query.city as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.status(200).json(new ApiResponse('Restaurant recommendations fetched successfully', items));
  }),

  // ---- Admin CRUD ----

  create: asyncHandler(async (req: Request, res: Response) => {
    let imageUrl = req.body.image as string | undefined;
    if (req.file) {
      imageUrl = await uploadService.uploadImageBuffer(req.file.buffer, 'triplora/restaurants', {
        baseUrl: `${req.protocol}://${req.get('host')}`,
        originalName: req.file.originalname,
      });
    }
    if (!imageUrl) throw ApiError.badRequest('An image file or image URL is required');

    const restaurant = await restaurantService.create({ ...req.body, image: imageUrl });
    res.status(201).json(new ApiResponse('Restaurant created successfully', restaurant));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    let body = req.body;
    if (req.file) {
      const imageUrl = await uploadService.uploadImageBuffer(req.file.buffer, 'triplora/restaurants', {
        baseUrl: `${req.protocol}://${req.get('host')}`,
        originalName: req.file.originalname,
      });
      body = { ...body, image: imageUrl };
    }
    const restaurant = await restaurantService.update(req.params.id, body);
    res.status(200).json(new ApiResponse('Restaurant updated successfully', restaurant));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await restaurantService.remove(req.params.id);
    res.status(200).json(new ApiResponse('Restaurant deleted successfully', null));
  }),
};
