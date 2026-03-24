import type { VercelResponse } from '@vercel/node';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

/**
 * Global error handler for API functions.
 */
export function handleError(error: unknown, res: VercelResponse) {
  console.error('[API Error]', error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      data: null,
      error: error.message,
    });
  }

  return res.status(500).json({
    data: null,
    error: 'Internal server error',
  });
}

/**
 * Helper: send success response.
 */
export function sendSuccess<T>(res: VercelResponse, data: T, status = 200) {
  return res.status(status).json({ data, error: null });
}

/**
 * Helper: method not allowed.
 */
export function methodNotAllowed(res: VercelResponse) {
  return res.status(405).json({ data: null, error: 'Method not allowed' });
}
