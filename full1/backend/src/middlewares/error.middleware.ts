import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

function fromPrismaError(error: Prisma.PrismaClientKnownRequestError): ApiError {
  switch (error.code) {
    case 'P2002': {
      const target = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return ApiError.conflict(`A record with this ${target} already exists`);
    }
    case 'P2025':
      return ApiError.notFound('Record not found');
    case 'P2003':
      return ApiError.badRequest('Invalid reference to a related record');
    default:
      return ApiError.internal('Database error occurred');
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    apiError = fromPrismaError(err);
  } else if (err instanceof Error) {
    apiError = new ApiError(500, err.message || 'Internal server error', undefined, false);
  } else {
    apiError = ApiError.internal();
  }

  if (!apiError.isOperational) {
    // eslint-disable-next-line no-console
    console.error('[unexpected error]', err);
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    ...(apiError.details ? { errors: apiError.details } : {}),
    ...(env.isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
}
