import type { NextFunction, Request, Response } from 'express';
import { ZodError, type AnyZodObject } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Validates req.{body,query,params} against a Zod schema shaped like
 * { body?, query?, params? }. On success, parsed/coerced values are
 * written back onto the request object.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        next(ApiError.badRequest('Validation failed', details));
        return;
      }
      next(error);
    }
  };
}
