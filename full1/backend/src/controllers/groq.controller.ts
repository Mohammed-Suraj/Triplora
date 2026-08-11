import type { Request, Response } from 'express';
import { groqService } from '../services/groq.service';
import { analyticsLogService } from '../services/analyticsLog.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const groqController = {
  generateTripPlan: asyncHandler(async (req: Request, res: Response) => {
    void analyticsLogService.logAiUsage('TRIP_PLAN', req.user?.sub);
    const plan = await groqService.generateTripPlan({
      budget: req.body.budget,
      days: req.body.days,
      travelStyle: req.body.travelStyle,
      interests: req.body.interests,
      destination: req.body.destination ?? null,
    });
    res.json(new ApiResponse('AI trip plan generated successfully', plan));
  }),

  naturalTripPlan: asyncHandler(async (req: Request, res: Response) => {
    void analyticsLogService.logAiUsage('TRIP_PLAN_NATURAL', req.user?.sub);
    const { plan, parsed } = await groqService.generateTripPlanFromPrompt(req.body.prompt);
    // Include the parsed params so the frontend can auto-update the planner UI.
    res.json(new ApiResponse('AI trip plan generated from your description', { plan, parsed }));
  }),
};