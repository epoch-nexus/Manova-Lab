import type { ApiErrorCode, ApiErrorDetail } from '../types/experiment.d.ts';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly details?: ApiErrorDetail[];

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code: ApiErrorCode = 'EXPERIMENT_NOT_FOUND', details?: ApiErrorDetail[]) {
    super(404, code, message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request payload', code: ApiErrorCode = 'INVALID_EXPERIMENT', details?: ApiErrorDetail[]) {
    super(400, code, message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: ApiErrorDetail[]) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code: ApiErrorCode = 'EXPERIMENT_ALREADY_PUBLISHED', details?: ApiErrorDetail[]) {
    super(409, code, message, details);
  }
}
