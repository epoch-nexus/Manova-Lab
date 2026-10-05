import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors.js';
import type { ApiErrorCode, ApiErrorDetail, ApiErrorResponse } from '../../types/experiment.d.ts';

/**
 * Builds standard API error detail and fieldErrors map from a ZodError.
 * Preserves the exact dotted path (e.g. 'trials.0.stimulus.content'), uses '_root' for empty paths,
 * includes the Zod issue code in each detail, and includes offending key names for unrecognized_keys.
 */
export function buildZodErrorPayload(err: ZodError, code: ApiErrorCode = 'VALIDATION_ERROR') {
  const details: ApiErrorDetail[] = [];
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of err.issues) {
    const path = issue.path.join('.');
    const fieldKey = path || '_root';

    let message = issue.message;
    if (issue.code === 'unrecognized_keys') {
      const keys = (issue as { keys?: string[] }).keys;
      if (keys && keys.length > 0) {
        message = `Unrecognized key(s) in object: ${keys.map((k) => `'${k}'`).join(', ')}`;
      }
    }

    details.push({
      field: issue.path.length > 0 ? path : undefined,
      message,
      code: issue.code,
    });

    if (!fieldErrors[fieldKey]) {
      fieldErrors[fieldKey] = [];
    }
    fieldErrors[fieldKey].push(message);
  }

  const firstMessage = details[0]?.message ?? 'Validation failed';

  return {
    code,
    message: firstMessage,
    details,
    fieldErrors,
  };
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response headers have already been sent, delegate to standard Express handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. AppError (custom domain errors - preserves any specific status and code carried)
  if (err instanceof AppError) {
    const payload: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && err.details.length > 0 ? { details: err.details } : {}),
        ...(err.fieldErrors && Object.keys(err.fieldErrors).length > 0
          ? { fieldErrors: err.fieldErrors }
          : {}),
      },
    };
    res.status(err.statusCode).json(payload);
    return;
  }

  // 2. Malformed JSON Body Parsing Error ('entity.parse.failed' or SyntaxError with body)
  if (
    (err instanceof SyntaxError && 'body' in err) ||
    (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed')
  ) {
    const payload: ApiErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON in request body.',
      },
    };
    res.status(400).json(payload);
    return;
  }

  // 3. Oversized Request Body ('entity.too.large' or 413 status)
  if (
    (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.too.large') ||
    (typeof err === 'object' &&
      err !== null &&
      ((err as { status?: number }).status === 413 || (err as { statusCode?: number }).statusCode === 413))
  ) {
    const payload: ApiErrorResponse = {
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds the permitted size limit.',
      },
    };
    res.status(413).json(payload);
    return;
  }

  // 4. Zod Validation Error (VALIDATION_ERROR for general payloads)
  if (err instanceof ZodError) {
    const errorPayload = buildZodErrorPayload(err, 'VALIDATION_ERROR');
    const payload: ApiErrorResponse = {
      error: errorPayload,
    };
    res.status(400).json(payload);
    return;
  }

  // 5. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const model = (err.meta?.['modelName'] as string) || '';
      const target = Array.isArray(err.meta?.['target'])
        ? (err.meta['target'] as string[]).join(', ')
        : typeof err.meta?.['target'] === 'string'
        ? (err.meta['target'] as string)
        : 'field';

      let code: ApiErrorCode = 'VALIDATION_ERROR';
      let message = `Unique constraint violation on ${target}. The specified identifier already exists.`;

      if (model === 'Researcher' || target.includes('email')) {
        code = 'EMAIL_ALREADY_EXISTS';
        message = 'A researcher with this email address already exists.';
      } else if (model === 'Experiment' || target.includes('slug')) {
        code = 'INVALID_EXPERIMENT';
        message = `Unique constraint violation on ${target}. The specified identifier already exists.`;
      } else if (model === 'ParticipantSession' || model === 'Session') {
        code = 'INVALID_RESPONSE';
        message = `Unique constraint violation on participant session ${target}.`;
      } else if (model === 'SessionResponse' || model === 'TrialResponse') {
        code = 'INVALID_RESPONSE';
        message = 'A response has already been recorded for this trial.';
      }

      const payload: ApiErrorResponse = {
        error: {
          code,
          message,
          details: [{ field: target, message: `Value for ${target} must be unique.` }],
        },
      };
      res.status(409).json(payload);
      return;
    }

    if (err.code === 'P2003') {
      const field = (err.meta?.['field_name'] as string) || 'foreign key';
      const payload: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Foreign key constraint failed on ${field}. Referenced record does not exist.`,
        },
      };
      res.status(400).json(payload);
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

    if (err.code === 'P2034') {
      const payload: ApiErrorResponse = {
        error: {
          code: 'TRANSACTION_CONFLICT',
          message: 'Transaction conflict occurred due to concurrent modifications. Please retry.',
        },
      };
      res.status(409).json(payload);
      return;
    }
  }

  // 6. CORS Not Allowed Error
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Cross-Origin Request Blocked: Origin is not permitted.',
      },
    });
    return;
  }

  // 7. Default unhandled server error fallback (never expose stack traces)
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
