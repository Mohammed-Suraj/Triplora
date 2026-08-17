import type { Request, Response } from 'express';
import { plannerTripService } from '../services/plannerTrip.service';
import { analyticsLogService } from '../services/analyticsLog.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

function requireUserId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  return req.user.sub;
}

export const plannerTripController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const trips = await plannerTripService.listForUser(userId);
    res.status(200).json(new ApiResponse('Trips fetched successfully', trips));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const trip = await plannerTripService.create(userId, req.body);
    res.status(201).json(new ApiResponse('Trip created successfully', trip));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const trip = await plannerTripService.getById(userId, req.params.id);
    res.status(200).json(new ApiResponse('Trip fetched successfully', trip));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const trip = await plannerTripService.update(userId, req.params.id, req.body);
    res.status(200).json(new ApiResponse('Trip saved successfully', trip));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    await plannerTripService.remove(userId, req.params.id);
    res.status(200).json(new ApiResponse('Trip deleted successfully', null));
  }),

  duplicate: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const trip = await plannerTripService.duplicate(userId, req.params.id);
    res.status(201).json(new ApiResponse('Trip duplicated successfully', trip));
  }),

  generateShareCode: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const trip = await plannerTripService.generateShareCode(userId, req.params.id);
    res.status(200).json(new ApiResponse('Share link generated successfully', trip));
  }),

  getShared: asyncHandler(async (req: Request, res: Response) => {
    const trip = await plannerTripService.getByShareCode(req.params.code);
    res.status(200).json(new ApiResponse('Shared trip fetched successfully', trip));
  }),

  optimizeAi: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    void analyticsLogService.logAiUsage('PLANNER_OPTIMIZE', userId);
    const days = await plannerTripService.optimizeWithAi(userId, req.body);
    res.status(200).json(new ApiResponse('Trip optimized by AI', days));
  }),
};
