import type { ApiErrorCode, ApiErrorDetail } from '../types/experiment.d.ts';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly details?: ApiErrorDetail[];
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetail[],
    fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.fieldErrors = fieldErrors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code: ApiErrorCode = 'EXPERIMENT_NOT_FOUND', details?: ApiErrorDetail[]) {
    super(404, code, message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request payload', code: ApiErrorCode = 'INVALID_EXPERIMENT', details?: ApiErrorDetail[], fieldErrors?: Record<string, string[]>) {
    super(400, code, message, details, fieldErrors);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: ApiErrorDetail[], fieldErrors?: Record<string, string[]>) {
    super(422, 'VALIDATION_ERROR', message, details, fieldErrors);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code: ApiErrorCode = 'EXPERIMENT_ALREADY_PUBLISHED', details?: ApiErrorDetail[]) {
    super(409, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code: ApiErrorCode = 'UNAUTHORIZED', details?: ApiErrorDetail[]) {
    super(401, code, message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden: you do not have permission to access this resource', code: ApiErrorCode = 'FORBIDDEN', details?: ApiErrorDetail[]) {
    super(403, code, message, details);
  }
}
