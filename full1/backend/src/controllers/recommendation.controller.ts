import type { Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const recommendationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 6);
    const recommendations = await recommendationService.forUser(req.user?.sub, limit);
    res.json(new ApiResponse('Recommendations fetched successfully', recommendations));
  }),
};
