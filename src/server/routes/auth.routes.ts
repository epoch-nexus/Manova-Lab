import { Router, type Request, type Response, type NextFunction } from 'express';
import { authService } from '../../domain/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rate-limiter.js';

export const authRouter = Router();

/**
 * POST /api/v1/auth/register
 * Register a new researcher
 */
authRouter.post(
  '/register',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Authenticate researcher and return JWT
 */
authRouter.post(
  '/login',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/auth/me
 * Retrieve authenticated researcher profile
 */
authRouter.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const researcherId = req.researcher!.id;
      const result = await authService.getMe(researcherId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
