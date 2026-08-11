import type { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

export const categoryController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await categoryService.list();
    res.status(200).json(new ApiResponse('Categories fetched successfully', categories));
  }),
};
