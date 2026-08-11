import type { Request, Response } from 'express';
import { smartSearchService } from '../services/smartSearch.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const smartSearchController = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const q = String(req.query.q ?? '').trim();
    const result = await smartSearchService.search(
      q,
      req.user?.sub,
      Math.max(1, Number(req.query.page ?? 1)),
      Math.min(100, Math.max(1, Number(req.query.limit ?? 12))),
    );
    res.json(new ApiResponse('Smart search results fetched successfully', result));
  }),

  suggest: asyncHandler(async (req: Request, res: Response) => {
    const q = String(req.query.q ?? '').trim();
    const suggestions = await smartSearchService.suggest(q);
    res.json(new ApiResponse('Search suggestions fetched successfully', suggestions));
  }),
};
