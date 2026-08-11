import type { Request, Response } from 'express';
import { assistantService } from '../services/assistant.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized('Authentication required');
  return req.user;
}

export const assistantController = {
  chat: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const result = await assistantService.chat(user.sub, req.body.message, req.body.conversationId ?? null);
    res.json(new ApiResponse('Assistant replied successfully', result));
  }),

  listConversations: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const conversations = await assistantService.listConversations(user.sub);
    res.json(new ApiResponse('Conversations fetched successfully', conversations));
  }),

  getConversation: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const result = await assistantService.getConversation(user.sub, req.params.id);
    res.json(new ApiResponse('Conversation fetched successfully', result));
  }),

  removeConversation: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    await assistantService.removeConversation(user.sub, req.params.id);
    res.json(new ApiResponse('Conversation deleted successfully', null));
  }),
};
