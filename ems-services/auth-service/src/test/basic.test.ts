/**
 * Basic Test Setup for Auth Service
 * 
 * This file verifies that the test environment is properly configured.
 */

import '@jest/globals';
import { 
  mockPrisma, 
  mockRabbitMQService, 
  mockJWT, 
  mockBcrypt, 
  mockLogger,
  createMockUser,
  createMockAccount,
  createMockJWT
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
  });

  it('should be able to create mock objects', () => {
    const mockUser = createMockUser();
    const mockAccount = createMockAccount();
    const mockJWTData = createMockJWT();

    expect(mockUser).toBeDefined();
    expect(mockUser.id).toBe('user-123');
    expect(mockUser.email).toBe('test@example.com');

    expect(mockAccount).toBeDefined();
    expect(mockAccount.userId).toBe('user-123');

    expect(mockJWTData).toBeDefined();
    expect(mockJWTData.userId).toBe('user-123');
  });

  it('should have mocks properly initialized', () => {
    expect(mockPrisma).toBeDefined();
    expect(mockRabbitMQService).toBeDefined();
    expect(mockJWT).toBeDefined();
    expect(mockBcrypt).toBeDefined();
    expect(mockLogger).toBeDefined();
  });
});
