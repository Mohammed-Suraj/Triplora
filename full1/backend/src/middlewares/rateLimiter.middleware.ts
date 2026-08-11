import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/** General-purpose limiter applied to the whole /api surface. */
export const globalRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/** Stricter limiter for sensitive auth endpoints (register/login) to slow brute force. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

/** Protects expensive / paid LLM endpoints (AI planner, assistant, smart search parse). */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Please wait a minute and try again.' },
});

/** Search endpoints - prevents abusive query flooding while staying generous. */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many searches. Please slow down and try again.' },
});

/** Review submission / reporting - limits spam. */
export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many review actions. Please try again later.' },
});
