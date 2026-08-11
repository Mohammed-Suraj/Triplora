import type { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  return req.user;
}

export const notificationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const { items, meta } = await notificationService.listForUser(
      user.sub,
      req.query as Record<string, string>,
    );
    res.json(new ApiResponse('Notifications fetched successfully', items, meta));
  }),

  unreadCount: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const count = await notificationService.unreadCount(user.sub);
    res.json(new ApiResponse('Unread count fetched successfully', { count }));
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const notification = await notificationService.markRead(user.sub, req.params.id);
    res.json(new ApiResponse('Notification marked as read', notification));
  }),

  markAllRead: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const result = await notificationService.markAllRead(user.sub);
    res.json(new ApiResponse('All notifications marked as read', result));
  }),
};
