export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details !== undefined && { details: this.details }),
    };
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super(message, 'AUTH_REQUIRED', 401, details);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied', details?: unknown) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class IntegrationError extends AppError {
  public readonly provider: string;

  constructor(provider: string, message: string, details?: unknown) {
    super(message, 'INTEGRATION_ERROR', 502, details);
    this.name = 'IntegrationError';
    this.provider = provider;
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', details?: unknown) {
    super(message, 'RATE_LIMITED', 429, details);
    this.name = 'RateLimitError';
  }
}

export class CitationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CITATION_MISSING', 422, details);
    this.name = 'CitationError';
  }
}

export class EncryptionError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'ENCRYPTION_ERROR', 500, details);
    this.name = 'EncryptionError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
