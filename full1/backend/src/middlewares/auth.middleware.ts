import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken, type JwtPayload } from '../utils/jwt';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      return token;
    }
  }
  if (req.cookies?.accessToken) {
    const token = (req.cookies.accessToken as string).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      return token;
    }
  }
  return null;
}

/** Requires a valid JWT access token. Populates req.user on success. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(ApiError.unauthorized('Authentication token missing'));
    return;
  }

  try {
    const payload: JwtPayload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/** Populates req.user if a valid token is present, but never blocks the request. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    req.user = verifyAccessToken(token);
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

/** Restricts access to the given roles. Must be used after requireAuth. */
export function requireRole(...roles: Array<'USER' | 'ADMIN'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}

/** Reusable admin-only middleware. Returns 401 when unauthenticated, 403 when not an ADMIN. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(ApiError.unauthorized('Authentication token missing'));
    return;
  }

  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
    return;
  }

  if (payload.role !== 'ADMIN') {
    next(ApiError.forbidden('Admin access only'));
    return;
  }

  req.user = payload;
  next();
}
