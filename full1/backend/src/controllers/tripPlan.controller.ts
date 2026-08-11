import type { Request, Response } from 'express';
import { tripPlanService } from '../services/tripPlan.service';
import { analyticsLogService } from '../services/analyticsLog.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

function requireUserId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  return req.user.sub;
}

export const tripPlanController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripPlan = await tripPlanService.create(userId, req.body);
    res.status(201).json(new ApiResponse('Itinerary generated successfully', tripPlan));
  }),

  save: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const tripPlan = await tripPlanService.save(userId, req.body);
    res.status(201).json(new ApiResponse('Itinerary saved successfully', tripPlan));
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const plans = await tripPlanService.listForUser(userId);
    res.status(200).json(new ApiResponse('Trip plans fetched successfully', plans));
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const plan = await tripPlanService.getById(userId, req.params.id);
    res.status(200).json(new ApiResponse('Trip plan fetched successfully', plan));
  }),

  updateTitle: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const plan = await tripPlanService.updateTitle(userId, req.params.id, req.body);
    res.status(200).json(new ApiResponse('Trip plan updated successfully', plan));
  }),

  duplicate: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const plan = await tripPlanService.duplicate(userId, req.params.id);
    res.status(201).json(new ApiResponse('Trip plan duplicated successfully', plan));
  }),

  chat: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    void analyticsLogService.logAiUsage('TRIP_CHAT', userId);
    const plan = await tripPlanService.chat(userId, req.params.id, req.body.message, req.body.history);
    res.status(200).json(new ApiResponse('Itinerary updated by the AI assistant', plan));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    await tripPlanService.remove(userId, req.params.id);
    res.status(200).json(new ApiResponse('Trip plan deleted successfully', null));
  }),
};