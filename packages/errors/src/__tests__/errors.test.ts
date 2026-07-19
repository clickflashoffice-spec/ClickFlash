import { describe, it, expect } from 'vitest';
import {
  AppError,
  ErrorCode,
  notFound,
  unauthorized,
  forbidden,
  validationError,
  conflict,
  rateLimited,
  internal,
  isAppError,
  toErrorResponse,
  wrapError
} from '../index.js';

describe('AppError', () => {
  it('should construct AppError with all fields', () => {
    const error = new AppError('Test error', ErrorCode.NETWORK_ERROR, 502, { key: 'val' }, false, new Error('cause'));
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(error.statusCode).toBe(502);
    expect(error.context).toEqual({ key: 'val' });
    expect(error.isOperational).toBe(false);
    expect(error.cause).toBeInstanceOf(Error);
  });

  it('should serialize and deserialize with toJSON and fromJSON', () => {
    const error = new AppError('Test error', ErrorCode.AUTH_EXPIRED, 401, { uid: 123 }, true, 'timeout');
    const json = error.toJSON();
    
    expect(json.message).toBe('Test error');
    expect(json.code).toBe(ErrorCode.AUTH_EXPIRED);
    
    const restored = AppError.fromJSON(json);
    expect(restored).toBeInstanceOf(AppError);
    expect(restored.message).toBe('Test error');
    expect(restored.code).toBe(ErrorCode.AUTH_EXPIRED);
    expect(restored.statusCode).toBe(401);
    expect(restored.context).toEqual({ uid: 123 });
    expect(restored.isOperational).toBe(true);
    expect(restored.cause).toBe('timeout');
    expect(restored.stack).toBe(error.stack);
  });
});

describe('Factory Functions', () => {
  it('notFound', () => {
    const error = notFound('User', '123');
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User with id 123 not found');
  });

  it('unauthorized', () => {
    const error = unauthorized('Bad token');
    expect(error.code).toBe(ErrorCode.AUTH_FAILED);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Bad token');
  });

  it('forbidden', () => {
    const error = forbidden('No access');
    expect(error.code).toBe(ErrorCode.AUTH_FORBIDDEN);
    expect(error.statusCode).toBe(403);
  });

  it('validationError', () => {
    const error = validationError({ field: 'required' });
    expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(error.statusCode).toBe(422);
    expect(error.context).toEqual({ field: 'required' });
  });

  it('conflict', () => {
    const error = conflict('Duplicate email');
    expect(error.code).toBe(ErrorCode.CONFLICT);
    expect(error.statusCode).toBe(409);
  });

  it('rateLimited', () => {
    const error = rateLimited(60);
    expect(error.code).toBe(ErrorCode.RATE_LIMITED);
    expect(error.statusCode).toBe(429);
    expect(error.context).toEqual({ retryAfter: 60 });
  });

  it('internal', () => {
    const error = internal('Db down', 'timeout');
    expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
    expect(error.cause).toBe('timeout');
  });
});

describe('Utility Functions', () => {
  it('isAppError', () => {
    expect(isAppError(new AppError('test'))).toBe(true);
    expect(isAppError(new Error('test'))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('toErrorResponse', () => {
    const appError = new AppError('Not Found', ErrorCode.NOT_FOUND, 404, { id: 1 });
    expect(toErrorResponse(appError)).toEqual({
      error: { code: 'NOT_FOUND', message: 'Not Found', statusCode: 404, context: { id: 1 } }
    });

    const plainError = new Error('Oops');
    expect(toErrorResponse(plainError)).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Oops', statusCode: 500 }
    });

    expect(toErrorResponse('string error')).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'string error', statusCode: 500 }
    });
  });

  it('wrapError', () => {
    const appError = new AppError('test');
    expect(wrapError(appError)).toBe(appError);

    const plainError = new Error('Oops');
    const wrapped = wrapError(plainError);
    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.message).toBe('Oops');
    expect(wrapped.cause).toBe(plainError);

    const stringError = wrapError('string error');
    expect(stringError).toBeInstanceOf(AppError);
    expect(stringError.message).toBe('An unexpected error occurred');
    expect(stringError.cause).toBe('string error');
  });
});
