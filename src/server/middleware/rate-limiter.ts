import rateLimit, { type Options } from 'express-rate-limit';
import { config } from '../../config/env.js';

/**
 * Creates a rate limiter instance with standardized error JSON payload.
 */
export function createRateLimiter(options?: Partial<Options>) {
  return rateLimit({
    windowMs: options?.windowMs ?? config.AUTH_RATE_LIMIT_WINDOW_MS,
    max: options?.max ?? config.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
        },
      });
    },
    skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_TEST !== 'true',
    ...options,
  });
}

/**
 * Dedicated rate limiter for sensitive authentication endpoints (register and login).
 */
export const authRateLimiter = createRateLimiter();

/**
 * Generous per-IP rate limiter for participant session creation (e.g., 60 requests per 15 minutes).
 */
export const sessionCreationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
});
