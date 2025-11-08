/**
 * Integration Tests for Auth Service Routes using Supertest
 * 
 * Tests all HTTP endpoints with real request/response cycles
 * to achieve comprehensive route coverage.
 */

import '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { AuthService } from '../services/auth.service';
import { registerRoutes } from '../routes/routes';
import {
  mockPrisma,
  createMockUser,
  resetAllMocks,
  mockRabbitMQService,
  mockJWT,
  mockBcrypt,
} from './mocks-simple';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock context service module
jest.mock('../services/context.service', () => {
  const mockGetCurrentUserId = jest.fn().mockReturnValue('user-123');
  const mockGetCurrentUser = jest.fn().mockReturnValue(null);
  const mockSetCurrentUser = jest.fn();
  const mockGetContext = jest.fn().mockReturnValue({
    requestId: 'req-123',
    userId: 'user-123',
    userEmail: 'test@example.com',
    userRole: 'USER',
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

// Mock middleware
jest.mock('../middleware/context.middleware', () => ({
  contextMiddleware: (req: any, res: any, next: any) => next(),
}));

jest.mock('../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    // Simulate authenticated user
    req.user = { id: 'user-123', email: 'test@example.com', role: 'USER' };
    next();
  },
}));

// Import the mocked context service to use in tests
import { contextService as mockContextService } from '../services/context.service';

describe('Routes Integration Tests with Supertest', () => {
  let app: Express;
  let authService: AuthService;

  beforeEach(() => {
    resetAllMocks();
    app = express();
    app.use(express.json());
    authService = new AuthService();
    registerRoutes(app, authService);

    // Reset context service mocks
    (mockContextService.getCurrentUserId as jest.Mock).mockReturnValue('user-123');
    (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(null);
    (mockContextService.getContext as jest.Mock).mockReturnValue({
      requestId: 'req-123',
      userId: 'user-123',
      userEmail: 'test@example.com',
      userRole: 'USER',
      timestamp: Date.now(),
    });
  });

  afterEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
  });

  // ============================================================================
  // PUBLIC ROUTES
  // ============================================================================

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = createMockUser({ id: 'new-user-123', email: 'newuser@example.com', name: 'New User' });
      
      // Mock the findUnique call (no existing user)
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      // Mock the transaction to return the created user
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          account: {
            create: jest.fn().mockResolvedValue({
              id: 'account-123',
              userId: mockUser.id,
              provider: 'credentials',
              providerAccountId: mockUser.id,
              passwordHash: 'hashed',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
        };
        return await callback(mockTx);
      });
      
      mockBcrypt.hash.mockResolvedValue('hashed_password');
      mockJWT.sign.mockReturnValue('mock.jwt.token');
      mockRabbitMQService.sendMessage.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        });

      if (response.status !== 201) {
        console.log('Registration failed:', response.body);
      }
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Registration successful');
      expect(response.body).toHaveProperty('token');
    });

    it('should return 400 for duplicate email', async () => {
      const existingUser = createMockUser({ isActive: true });
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /login', () => {
    it('should login user successfully', async () => {
      const mockAccount = {
        id: 'account-123',
        userId: 'user-123',
        provider: 'email',
        type: 'credentials',
        providerAccountId: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const mockUser = createMockUser({ 
        isActive: true, 
        password: 'hashed_password',
        accounts: [mockAccount], // Include accounts array
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.sign.mockReturnValue('mock.jwt.token');

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      if (response.status !== 200) {
        console.log('Login failed:', response.body);
      }
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should return 400 for inactive user', async () => {
      const inactiveUser = createMockUser({ isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for incorrect password', async () => {
      const mockUser = createMockUser({ isActive: true });
      const mockAccount = {
        id: 'account-123',
        userId: mockUser.id,
        provider: 'credentials',
        providerAccountId: mockUser.id,
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.account.findFirst.mockResolvedValue(mockAccount);
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /forgot-password', () => {
    it('should send password reset email', async () => {
      const mockUser = createMockUser({ isActive: true });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockRabbitMQService.sendMessage.mockResolvedValue(undefined);
      mockJWT.sign.mockReturnValue('reset.token');

      const response = await request(app)
        .post('/forgot-password')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password reset');
    });

    it('should not reveal if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('If an account with that email exists');
    });
  });

  describe('POST /verify-reset-token', () => {
    it('should verify valid reset token', async () => {
      const mockUser = createMockUser({ isActive: true });
      mockJWT.verify.mockReturnValue({
        userId: mockUser.id,
        type: 'password-reset',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/verify-reset-token')
        .send({
          token: 'valid.reset.token',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid');
    });

    it('should reject invalid token', async () => {
      mockJWT.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/verify-reset-token')
        .send({
          token: 'invalid.token',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /reset-password', () => {
    it('should reset password with valid token', async () => {
      const mockUser = createMockUser({ isActive: true });
      mockJWT.verify.mockReturnValue({
        userId: mockUser.id,
        type: 'password-reset',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.account.update.mockResolvedValue({
        id: 'account-123',
        userId: mockUser.id,
        provider: 'credentials',
        providerAccountId: mockUser.id,
        passwordHash: 'new-hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockBcrypt.hash.mockResolvedValue('new-hashed-password');

      const response = await request(app)
        .post('/reset-password')
        .send({
          token: 'valid.reset.token',
          newPassword: 'newPassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /verify-email', () => {
    it('should verify email with valid token', async () => {
      const mockUser = createMockUser({ isActive: false, emailVerified: null });
      const verifiedUser = createMockUser({ isActive: true, emailVerified: new Date() });
      
      mockJWT.verify.mockReturnValue({
        userId: mockUser.id,
        type: 'email-verification',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(verifiedUser);
      mockJWT.sign.mockReturnValue('new.jwt.token');

      const response = await request(app)
        .get('/verify-email')
        .query({ token: 'valid.verification.token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Email verified');
    });

    it('should return 400 without token', async () => {
      const response = await request(app)
        .get('/verify-email');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token is required');
    });
  });

  // ============================================================================
  // UTILITY ROUTES
  // ============================================================================

  describe('GET /check-user', () => {
    it('should return true for existing user', async () => {
      mockPrisma.user.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/check-user')
        .query({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('exists', true);
    });

    it('should return false for non-existent user', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/check-user')
        .query({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('exists', false);
    });

    it('should return 400 without email', async () => {
      const response = await request(app)
        .get('/check-user');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Email is required');
    });
  });

  describe('POST /verify-token', () => {
    it('should verify valid JWT token', async () => {
      const mockUser = createMockUser({ isActive: true });
      mockJWT.verify.mockReturnValue({ userId: mockUser.id });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/verify-token')
        .send({ token: 'valid.jwt.token' });

      expect(response.status).toBe(200);
    });

    it('should return 400 without token', async () => {
      const response = await request(app)
        .post('/verify-token')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /validate-user', () => {
    it('should validate active user', async () => {
      const mockUser = createMockUser({ isActive: true });
      mockJWT.verify.mockReturnValue({ userId: mockUser.id });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/validate-user')
        .send({ token: 'valid.jwt.token' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', mockUser.id);
    });

    it('should return 403 for inactive user', async () => {
      const mockUser = createMockUser({ isActive: false });
      mockJWT.verify.mockReturnValue({ userId: mockUser.id });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/validate-user')
        .send({ token: 'valid.jwt.token' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not active');
    });

    it('should return 400 without token', async () => {
      const response = await request(app)
        .post('/validate-user')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Token is required');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'auth-service');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  // ============================================================================
  // PROTECTED ROUTES
  // ============================================================================

  describe('GET /profile', () => {
    it('should get user profile', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer mock.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', mockUser.id);
      expect(response.body).toHaveProperty('email', mockUser.email);
    });

    it('should return 400 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer mock.token');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /profile', () => {
    it('should update user profile', async () => {
      const mockUser = createMockUser();
      const updatedUser = createMockUser({ name: 'Updated Name' });
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/profile')
        .set('Authorization', 'Bearer mock.token')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Name');
    });

    it('should update password', async () => {
      const mockUser = createMockUser();
      const mockAccount = {
        id: 'account-123',
        userId: mockUser.id,
        provider: 'credentials',
        providerAccountId: mockUser.id,
        passwordHash: 'old-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.account.findFirst.mockResolvedValue(mockAccount);
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('new-hash');
      mockPrisma.account.update.mockResolvedValue({
        ...mockAccount,
        passwordHash: 'new-hash',
      });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/profile')
        .set('Authorization', 'Bearer mock.token')
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword123',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/logout')
        .set('Authorization', 'Bearer mock.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logged out');
    });
  });

  describe('GET /me', () => {
    it('should return current user context', async () => {
      const response = await request(app)
        .get('/me')
        .set('Authorization', 'Bearer mock.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('requestId');
    });

    it('should return 401 without context', async () => {
      (mockContextService.getContext as jest.Mock).mockReturnValue(null);

      const response = await request(app)
        .get('/me')
        .set('Authorization', 'Bearer mock.token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No user context');
    });
  });

  // ============================================================================
  // INTERNAL ROUTES
  // ============================================================================

  describe('GET /internal/users/:id', () => {
    it('should get user by ID with valid service header', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/internal/users/user-123')
        .set('x-internal-service', 'event-service');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', mockUser.id);
    });

    it('should return 403 without valid service header', async () => {
      const response = await request(app)
        .get('/internal/users/user-123');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Internal service only');
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .get('/internal/users/nonexistent')
        .set('x-internal-service', 'booking-service');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  // ============================================================================
  // ADMIN ROUTES
  // ============================================================================

  describe('GET /admin/stats', () => {
    it('should return user statistics for admin', async () => {
      const adminUser = createMockUser({ role: 'ADMIN' });
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.count.mockResolvedValue(150);
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', 'Bearer admin.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalUsers', 150);
    });

    it('should return 403 for non-admin user', async () => {
      const regularUser = createMockUser({ role: 'USER' });
      mockPrisma.user.findUnique.mockResolvedValue(regularUser);
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(regularUser);

      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', 'Bearer user.token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Admin only');
    });
  });

  describe('GET /admin/users', () => {
    it('should return paginated user list for admin', async () => {
      const adminUser = createMockUser({ role: 'ADMIN' });
      const mockUsers = [
        createMockUser({ email: 'user1@example.com' }),
        createMockUser({ email: 'user2@example.com' }),
      ];

      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .get('/admin/users')
        .query({ page: 1, limit: 10 })
        .set('Authorization', 'Bearer admin.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('total', 2);
    });

    it('should filter users by role', async () => {
      const adminUser = createMockUser({ role: 'ADMIN' });
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.user.findMany.mockResolvedValue([]);
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .get('/admin/users')
        .query({ role: 'SPEAKER', page: 1, limit: 10 })
        .set('Authorization', 'Bearer admin.token');

      expect(response.status).toBe(200);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'SPEAKER',
          }),
        })
      );
    });

    it('should search users by email or name', async () => {
      const adminUser = createMockUser({ role: 'ADMIN' });
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([]);
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .get('/admin/users')
        .query({ search: 'john', page: 1, limit: 10 })
        .set('Authorization', 'Bearer admin.token');

      expect(response.status).toBe(200);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('GET /admins', () => {
    it('should return list of admin users', async () => {
      const adminUsers = [
        createMockUser({ role: 'ADMIN', email: 'admin1@example.com' }),
        createMockUser({ role: 'ADMIN', email: 'admin2@example.com' }),
      ];

      mockPrisma.user.findMany.mockResolvedValue(adminUsers as any);

      const response = await request(app)
        .get('/admins')
        .set('Authorization', 'Bearer user.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
    });
  });

  describe('POST /admin/activate-users', () => {
    it('should activate multiple users', async () => {
      const adminUser = createMockUser({ role: 'ADMIN' });
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .post('/admin/activate-users')
        .set('Authorization', 'Bearer admin.token')
        .send({
          emails: ['user1@example.com', 'user2@example.com'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('activated');
      expect(response.body).toHaveProperty('total', 2);
    });

    it('should return 403 for non-admin', async () => {
      const regularUser = createMockUser({ role: 'USER' });
      mockPrisma.user.findUnique.mockResolvedValue(regularUser);
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(regularUser);

      const response = await request(app)
        .post('/admin/activate-users')
        .set('Authorization', 'Bearer user.token')
        .send({
          emails: ['user1@example.com'],
        });

      expect(response.status).toBe(403);
    });

    it('should return 400 without emails array', async () => {
      const adminUser = createMockUser({ role: 'ADMIN' });
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .post('/admin/activate-users')
        .set('Authorization', 'Bearer admin.token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('emails array is required');
    });
  });

  describe('GET /admin/reports/user-growth', () => {
    it('should return user growth data', async () => {
      const adminUser = createMockUser({ role: 'ADMIN' });
      const mockUserData = [
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-01-20') },
        { createdAt: new Date('2024-02-10') },
      ];

      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.findMany.mockResolvedValue(mockUserData as any);
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(adminUser);

      const response = await request(app)
        .get('/admin/reports/user-growth')
        .set('Authorization', 'Bearer admin.token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should return 403 for non-admin', async () => {
      const regularUser = createMockUser({ role: 'USER' });
      mockPrisma.user.findUnique.mockResolvedValue(regularUser);
      (mockContextService.getCurrentUser as jest.Mock).mockReturnValue(regularUser);

      const response = await request(app)
        .get('/admin/reports/user-growth')
        .set('Authorization', 'Bearer user.token');

      expect(response.status).toBe(403);
    });
  });
});
