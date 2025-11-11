/**
 * Basic Test Setup for Feedback Service
 *
 * This file verifies that the test environment is properly configured.
 */

import { describe, it, expect } from '@jest/globals';
import {
  mockPrisma,
  mockAxios,
  mockJWT,
  mockLogger,
  createMockFeedbackForm,
  createMockFeedbackResponse,
  createMockUser,
} from './mocks-simple';

describe('Basic Test Setup', () => {
  it('should have Jest globals available', () => {
    expect(expect).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(beforeAll).toBeDefined();
    expect(afterAll).toBeDefined();
    expect(beforeEach).toBeDefined();
    expect(afterEach).toBeDefined();
  });

  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have required environment variables', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.GATEWAY_URL).toBeDefined();
  });

  it('should be able to create mock objects', () => {
    const mockForm = createMockFeedbackForm();
    const mockResponse = createMockFeedbackResponse();
    const mockUser = createMockUser();

    expect(mockForm).toBeDefined();
    expect(mockForm.id).toBe('form-123');
    expect(mockForm.eventId).toBe('event-123');

    expect(mockResponse).toBeDefined();
    expect(mockResponse.id).toBe('response-123');
    expect(mockResponse.rating).toBe(5);

    expect(mockUser).toBeDefined();
    expect(mockUser.id).toBe('user-123');
    expect(mockUser.email).toBe('test@example.com');
  });

  it('should have mocks properly initialized', () => {
    expect(mockPrisma).toBeDefined();
    expect(mockAxios).toBeDefined();
    expect(mockJWT).toBeDefined();
    expect(mockLogger).toBeDefined();
  });
});

