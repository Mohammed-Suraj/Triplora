import type { Request, Response } from 'express';
import { experienceService } from '../services/experience.service';
import { uploadService } from '../services/upload.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const experienceController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await experienceService.list(req.query as Record<string, string>);
    res.status(200).json(new ApiResponse('Experiences fetched successfully', items, meta));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const experience = await experienceService.getByIdOrSlug(req.params.id);
    res.status(200).json(new ApiResponse('Experience fetched successfully', experience));
  }),

  // ---- Admin CRUD ----

  create: asyncHandler(async (req: Request, res: Response) => {
    let imageUrl = req.body.image as string | undefined;
    if (req.file) {
      imageUrl = await uploadService.uploadImageBuffer(req.file.buffer, 'triplora/experiences', {
        baseUrl: `${req.protocol}://${req.get('host')}`,
        originalName: req.file.originalname,
      });
    }
    if (!imageUrl) throw ApiError.badRequest('An image file or image URL is required');

    const experience = await experienceService.create({ ...req.body, image: imageUrl });
    res.status(201).json(new ApiResponse('Experience created successfully', experience));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    let body = req.body;
    if (req.file) {
      const imageUrl = await uploadService.uploadImageBuffer(req.file.buffer, 'triplora/experiences', {
        baseUrl: `${req.protocol}://${req.get('host')}`,
        originalName: req.file.originalname,
      });
      body = { ...body, image: imageUrl };
    }
    const experience = await experienceService.update(req.params.id, body);
    res.status(200).json(new ApiResponse('Experience updated successfully', experience));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await experienceService.remove(req.params.id);
    res.status(200).json(new ApiResponse('Experience deleted successfully', null));
  }),
};