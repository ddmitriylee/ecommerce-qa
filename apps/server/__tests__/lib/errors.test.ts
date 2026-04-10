import { describe, it, expect } from 'vitest';
import { AppError, NotFoundError, ValidationError, handleError, sendSuccess, methodNotAllowed } from '../../lib/errors.js';

// ─────────────────────────────────────────────────────────────────────────────
// Error Classes
// ─────────────────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('TC-ERR-UNIT-01: sets statusCode and message correctly', () => {
    const err = new AppError(422, 'Unprocessable Entity');
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe('Unprocessable Entity');
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('NotFoundError', () => {
  it('TC-ERR-UNIT-02: uses 404 status with resource name', () => {
    const err = new NotFoundError('Product');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Product not found');
    expect(err.name).toBe('NotFoundError');
  });

  it('TC-ERR-UNIT-03: defaults to "Resource" when no argument given', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Resource not found');
  });
});

describe('ValidationError', () => {
  it('TC-ERR-UNIT-04: uses 400 status with custom message', () => {
    const err = new ValidationError('email is required');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('email is required');
    expect(err.name).toBe('ValidationError');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper Builders
// ─────────────────────────────────────────────────────────────────────────────

function mockRes() {
  let statusCode = 0;
  let body: any = null;
  const res: any = {
    status(code: number) { statusCode = code; return res; },
    json(data: any) { body = data; return res; },
    get statusCode() { return statusCode; },
    get body() { return body; },
  };
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// handleError
// ─────────────────────────────────────────────────────────────────────────────

describe('handleError', () => {
  it('TC-ERR-UNIT-05: returns AppError status and message', () => {
    const res = mockRes();
    handleError(new AppError(409, 'Conflict'), res);
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ data: null, error: 'Conflict' });
  });

  it('TC-ERR-UNIT-06: falls back to 500 for unknown errors', () => {
    const res = mockRes();
    handleError(new Error('random'), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });

  it('TC-ERR-UNIT-07: handles non-Error thrown values (strings)', () => {
    const res = mockRes();
    handleError('something went wrong', res);
    expect(res.statusCode).toBe(500);
    expect(res.body.data).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sendSuccess
// ─────────────────────────────────────────────────────────────────────────────

describe('sendSuccess', () => {
  it('TC-ERR-UNIT-08: returns 200 with data by default', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: { id: 1 }, error: null });
  });

  it('TC-ERR-UNIT-09: accepts custom status code (e.g. 201)', () => {
    const res = mockRes();
    sendSuccess(res, { created: true }, 201);
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toEqual({ created: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// methodNotAllowed
// ─────────────────────────────────────────────────────────────────────────────

describe('methodNotAllowed', () => {
  it('TC-ERR-UNIT-10: returns 405 with correct error message', () => {
    const res = mockRes();
    methodNotAllowed(res);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe('Method not allowed');
  });
});
