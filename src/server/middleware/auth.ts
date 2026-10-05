import type { Request, Response, NextFunction } from 'express';
import { authService } from '../../domain/auth.service.js';
import { UnauthorizedError } from '../errors.js';
import type { AuthenticatedResearcher } from '../../types/experiment.d.ts';
import { prisma } from '../../db/prisma.js';

declare global {
  namespace Express {
    interface Request {
      researcher?: AuthenticatedResearcher;
    }
  }
}

interface CacheEntry {
  exists: boolean;
  expiresAt: number;
}

const researcherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5_000; // 5 seconds short-TTL

export function clearResearcherCache(): void {
  researcherCache.clear();
}

/**
 * Authentication middleware for protected researcher routes.
 * Requires a valid Bearer JWT in the Authorization header.
 * Verifies that the researcher account still exists in the database.
 * Attaches the authenticated researcher identity to `req.researcher`.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
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

    // Verify researcher existence in database to prevent deleted researcher FK violations
    const now = Date.now();
    const cached = researcherCache.get(payload.id);
    let exists = false;

    if (cached && cached.expiresAt > now) {
      exists = cached.exists;
    } else {
      const researcher = await prisma.researcher.findUnique({
        where: { id: payload.id },
        select: { id: true },
      });
      exists = !!researcher;
      researcherCache.set(payload.id, {
        exists,
        expiresAt: now + CACHE_TTL_MS,
      });
    }

    if (!exists) {
      return next(new UnauthorizedError('Researcher account no longer exists', 'UNAUTHORIZED'));
    }

    req.researcher = {
      id: payload.id,
      email: payload.email,
    };
    next();
  } catch (err) {
    next(err);
  }
}
