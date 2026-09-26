import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors.js';
import type { ApiErrorResponse } from '../../types/experiment.d.ts';

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. AppError (custom domain errors)
  if (err instanceof AppError) {
    const payload: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && err.details.length > 0 ? { details: err.details } : {}),
      },
    };
    res.status(err.statusCode).json(payload);
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.length > 0 ? e.path.join('.') : undefined,
      message: e.message,
    }));
    const payload: ApiErrorResponse = {
      error: {
        code: 'INVALID_EXPERIMENT',
        message: err.errors[0]?.message ?? 'Validation failed for experiment payload',
        details,
      },
    };
    res.status(400).json(payload);
    return;
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.['target'])
        ? (err.meta['target'] as string[]).join(', ')
        : 'field';
      const payload: ApiErrorResponse = {
        error: {
          code: 'INVALID_EXPERIMENT',
          message: `Unique constraint violation on ${target}. The specified identifier already exists.`,
          details: [{ field: target, message: `Value for ${target} must be unique.` }],
        },
      };
      res.status(409).json(payload);
      return;
    }

    if (err.code === 'P2025') {
      const payload: ApiErrorResponse = {
        error: {
          code: 'EXPERIMENT_NOT_FOUND',
          message: 'Requested record was not found in the database.',
        },
      };
      res.status(404).json(payload);
      return;
    }
  }

  // 4. CORS Not Allowed Error
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Cross-Origin Request Blocked: Origin is not permitted.',
      },
    });
    return;
  }

  // 5. Default unhandled server error fallback (never expose stack traces)
  const isProd = process.env.NODE_ENV === 'production';
  const message =
    err instanceof Error && !isProd
      ? err.message
      : 'An unexpected internal server error occurred.';

  const payload: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
    },
  };

  res.status(500).json(payload);
};
