import type { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.register(req.body);
    res.cookie('accessToken', tokens.accessToken, cookieOptions);
    res.status(201).json(new ApiResponse('Account created successfully', { user, ...tokens }));
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.login(req.body);
    res.cookie('accessToken', tokens.accessToken, cookieOptions);
    res.status(200).json(new ApiResponse('Logged in successfully', { user, ...tokens }));
  }),

  logout: asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie('accessToken');
    res.status(200).json(new ApiResponse('Logged out successfully', null));
  }),

  profile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }
    const user = await authService.getProfile(req.user.sub);
    res.status(200).json(new ApiResponse('Profile fetched successfully', user));
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }
    const user = await authService.updateProfile(req.user.sub, req.body);
    res.status(200).json(new ApiResponse('Profile updated successfully', user));
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }
    await authService.changePassword(req.user.sub, req.body);
    res.status(200).json(new ApiResponse('Password changed successfully', null));
  }),

  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.verifyEmail(req.body);
    res.status(200).json(new ApiResponse('Email verified successfully', result));
  }),

  requestPasswordReset: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.requestPasswordReset(req.body);
    res.status(200).json(new ApiResponse('Password reset email sent', result));
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    res.status(200).json(new ApiResponse('Password reset successfully', null));
  }),

  getEmailPreferences: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }
    const prefs = await authService.getEmailPreferences(req.user.sub);
    res.status(200).json(new ApiResponse('Email preferences fetched successfully', prefs));
  }),

  updateEmailPreferences: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }
    const prefs = await authService.updateEmailPreferences(req.user.sub, req.body);
    res.status(200).json(new ApiResponse('Email preferences updated successfully', prefs));
  }),
};
