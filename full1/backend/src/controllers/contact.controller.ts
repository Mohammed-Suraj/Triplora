import type { Request, Response } from 'express';
import { contactService } from '../services/contact.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

export const contactController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const message = await contactService.create(req.body);
    res.status(201).json(new ApiResponse('Thanks for reaching out! We\u2019ll get back to you soon.', message));
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, meta } = await contactService.list(req.query as Record<string, string>);
    res.status(200).json(new ApiResponse('Contact messages fetched successfully', items, meta));
  }),
};
