/**
 * Integration Tests for Seeder Routes
 *
 * Tests all seeder endpoints with comprehensive coverage:
 * - POST /admin/seed/activate-user
 * - POST /admin/seed/update-user-date
 */

import '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { AuthService } from '../../services/auth.service';
import { registerSeederRoutes } from '../seeder.routes';
import {
  mockPrisma,
  createMockUser,
  resetAllMocks,
} from '../../test/mocks-simple';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock database module (dynamically imported in routes)
// Create a shared mock function that will be used by both static and dynamic imports
const mockUpdateManyShared = jest.fn();

// Use jest.doMock for dynamic imports - this must be called before the import
jest.doMock('../../database', () => {
  return {
    prisma: {
      user: {
        updateMany: mockUpdateManyShared,
      },
    },
  };
});

// Also use jest.mock for static imports
jest.mock('../../database', () => {
  return {
    prisma: {
      user: {
        updateMany: mockUpdateManyShared,
      },
    },
  };
});

// Helper function to get the mock
const getMockUpdateMany = () => {
  return mockUpdateManyShared;
};

// Mock context service
jest.mock('../../services/context.service', () => {
  const mockGetCurrentUserId = jest.fn().mockReturnValue('admin-123');
  const mockGetCurrentUser = jest.fn().mockReturnValue(null);
  const mockSetCurrentUser = jest.fn();
  const mockGetContext = jest.fn().mockReturnValue({
    requestId: 'req-123',
    userId: 'admin-123',
    userEmail: 'admin@example.com',
    userRole: 'ADMIN',
    timestamp: Date.now(),
  });

  return {
    contextService: {
      getCurrentUserId: mockGetCurrentUserId,
      getCurrentUser: mockGetCurrentUser,
      setCurrentUser: mockSetCurrentUser,
      getContext: mockGetContext,
    },
  };
});

// Mock auth middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => next(),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Import mocked services
import { contextService as mockContextService } from '../../services/context.service';

describe('Seeder Routes Integration Tests', () => {
  let app: Express;
  let authService: AuthService;
  let getProfileSpy: jest.SpiedFunction<any>;

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    // Reset the database mock FIRST, before routes are registered
    const mockUpdateMany = getMockUpdateMany();
    mockUpdateMany.mockClear();
    mockUpdateMany.mockReset();
    // Set default return value - this will be used by dynamic imports
    mockUpdateMany.mockResolvedValue({ count: 1 });

    // Note: Dynamic imports (await import()) in the routes don't work well with Jest mocks
    // The mock is set up at module level, but dynamic imports may not use it
    // This is a known Jest limitation with dynamic imports

    // Reset context mocks
    (mockContextService.getCurrentUserId as jest.Mock).mockReturnValue('admin-123');
    (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(null);

    app = express();
    app.use(express.json());
    authService = new AuthService();

    // Spy on getProfile method
    getProfileSpy = jest.spyOn(authService, 'getProfile');

    // Register routes AFTER mocks are set up
    registerSeederRoutes(app, authService);
  });

  afterEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    getProfileSpy.mockRestore();
  });

  // ============================================================================
  // POST /admin/seed/activate-user
  // ============================================================================

  describe('POST /admin/seed/activate-user', () => {
    it('should return 403 when user is not admin', async () => {
      const regularUser = createMockUser({ id: 'user-123', role: 'USER' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(regularUser);

      const response = await request(app)
        .post('/admin/seed/activate-user')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Access denied: Admin only',
      });
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 403 when user is null', async () => {
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(null);
      getProfileSpy.mockResolvedValue(null);

      const response = await request(app)
        .post('/admin/seed/activate-user')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Access denied: Admin only',
      });
    });

    it('should return 400 when email is missing', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: 'ADMIN' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .post('/admin/seed/activate-user')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'email is required and must be a string',
      });
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 400 when email is not a string', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: 'ADMIN' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .post('/admin/seed/activate-user')
        .send({ email: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'email is required and must be a string',
      });
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 500 when database update fails', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: 'ADMIN' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);
      getMockUpdateMany().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/admin/seed/activate-user')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to activate user',
      });
    });

    it('should return 500 when getProfile fails', async () => {
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(null);
      getProfileSpy.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/admin/seed/activate-user')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to activate user',
      });
    });

    it('should return 403 when fetched user is not admin', async () => {
      const regularUser = createMockUser({ id: 'user-123', role: 'USER' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(null);
      getProfileSpy.mockResolvedValue(regularUser);

      const response = await request(app)
        .post('/admin/seed/activate-user')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Access denied: Admin only',
      });
    });
  });

  // ============================================================================
  // POST /admin/seed/update-user-date
  // ============================================================================

  describe('POST /admin/seed/update-user-date', () => {
    it('should return 403 when user is not admin', async () => {
      const regularUser = createMockUser({ id: 'user-123', role: 'USER' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(regularUser);

      const response = await request(app)
        .post('/admin/seed/update-user-date')
        .send({
          email: 'user@example.com',
          createdAt: '2024-01-15T10:00:00Z',
        });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Access denied: Admin only',
      });
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 403 when user is null', async () => {
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(null);
      getProfileSpy.mockResolvedValue(null);

      const response = await request(app)
        .post('/admin/seed/update-user-date')
        .send({
          email: 'user@example.com',
          createdAt: '2024-01-15T10:00:00Z',
        });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Access denied: Admin only',
      });
    });

    it('should return 400 when email is missing', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: 'ADMIN' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .post('/admin/seed/update-user-date')
        .send({
          createdAt: '2024-01-15T10:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'email is required and must be a string',
      });
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 400 when email is not a string', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: 'ADMIN' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .post('/admin/seed/update-user-date')
        .send({
          email: 123,
          createdAt: '2024-01-15T10:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'email is required and must be a string',
      });
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 400 when createdAt is missing', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: 'ADMIN' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .post('/admin/seed/update-user-date')
        .send({
          email: 'user@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'createdAt is required and must be an ISO date string',
      });
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 400 when createdAt is not a string', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: 'ADMIN' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .post('/admin/seed/update-user-date')
        .send({
          email: 'user@example.com',
          createdAt: 123,
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'createdAt is required and must be an ISO date string',
      });
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 400 when createdAt is invalid date', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: 'ADMIN' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .post('/admin/seed/update-user-date')
        .send({
          email: 'user@example.com',
          createdAt: 'invalid-date',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'createdAt must be a valid ISO date string',
      });
      expect(getMockUpdateMany()).not.toHaveBeenCalled();
    });

    it('should return 500 when database update fails', async () => {
      const adminUser = createMockUser({ id: 'admin-123', role: 'ADMIN' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);
      getMockUpdateMany().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/admin/seed/update-user-date')
        .send({
          email: 'user@example.com',
          createdAt: '2024-01-15T10:00:00Z',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to update user date',
      });
    });

    it('should return 500 when getProfile fails', async () => {
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(null);
      getProfileSpy.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/admin/seed/update-user-date')
        .send({
          email: 'user@example.com',
          createdAt: '2024-01-15T10:00:00Z',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to update user date',
      });
    });

    it('should return 403 when fetched user is not admin', async () => {
      const regularUser = createMockUser({ id: 'user-123', role: 'USER' });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(null);
      getProfileSpy.mockResolvedValue(regularUser);

      const response = await request(app)
        .post('/admin/seed/update-user-date')
        .send({
          email: 'user@example.com',
          createdAt: '2024-01-15T10:00:00Z',
        });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Access denied: Admin only',
      });
    });
  });
});

