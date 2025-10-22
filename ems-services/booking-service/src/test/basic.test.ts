/**
 * Basic Test Setup Validation for Booking Service
 * 
 * This file contains basic tests to validate that the test environment
 * is properly configured and all necessary components are available.
 */

import '@jest/globals';

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
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.RABBITMQ_URL).toBeDefined();
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.PORT).toBeDefined();
  });

  it('should be able to create mock objects', () => {
    const mockData = {
      id: 'test-id',
      name: 'Test Object',
      createdAt: new Date().toISOString(),
    };

    expect(mockData).toBeDefined();
    expect(mockData.id).toBe('test-id');
    expect(mockData.name).toBe('Test Object');
    expect(mockData.createdAt).toBeDefined();
  });
});
