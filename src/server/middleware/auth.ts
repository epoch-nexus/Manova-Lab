import type { Request, Response, NextFunction } from 'express';
import { authService } from '../../domain/auth.service.js';
import { UnauthorizedError } from '../errors.js';
import type { AuthenticatedResearcher } from '../../types/experiment.d.ts';

declare global {
  namespace Express {
    interface Request {
      researcher?: AuthenticatedResearcher;
    }
  }
}

/**
 * Authentication middleware for protected researcher routes.
 * Requires a valid Bearer JWT in the Authorization header.
 * Attaches the authenticated researcher identity to `req.researcher`.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new UnauthorizedError('Authentication token missing'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(new UnauthorizedError('Invalid authorization header format. Expected "Bearer <token>"'));
  }

  const token = parts[1]!;
  try {
    const payload = authService.verifyToken(token);
    req.researcher = {
      id: payload.id,
      email: payload.email,
    };
    next();
  } catch (err) {
    next(err);
  }
}
