/**
 * HTTP Error Utility Tests
 *
 * Tests for http-error utility function
 */

import { describe, it, expect } from '@jest/globals';
import { httpError, HttpError } from '../http-error';

describe('httpError', () => {
  it('should create an HttpError with status and message', () => {
    const error = httpError(404, 'Not found');

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.expose).toBe(true);
  });

  it('should create an HttpError with different status codes', () => {
    const error400 = httpError(400, 'Bad Request');
    const error500 = httpError(500, 'Internal Server Error');

    expect(error400.status).toBe(400);
    expect(error400.message).toBe('Bad Request');
    expect(error500.status).toBe(500);
    expect(error500.message).toBe('Internal Server Error');
  });

  it('should set expose property to true', () => {
    const error = httpError(403, 'Forbidden');

    expect(error.expose).toBe(true);
  });

  it('should be an instance of Error', () => {
    const error = httpError(401, 'Unauthorized');

    expect(error instanceof Error).toBe(true);
  });

  it('should have HttpError interface properties', () => {
    const error = httpError(422, 'Unprocessable Entity') as HttpError;

    expect(error.status).toBeDefined();
    expect(error.expose).toBeDefined();
    expect(typeof error.status).toBe('number');
    expect(typeof error.expose).toBe('boolean');
  });
});

