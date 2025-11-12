/**
 * Simple Route Module Tests for Auth Service
 * 
 * Verifies that routes can be imported and registered without errors.
 * Tests route configuration and module loading.
 */

import '@jest/globals';
import express, { Express } from 'express';
import { AuthService } from '../services/auth.service';
import { resetAllMocks } from './mocks-simple';

// Mock uuid before importing routes
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-1234'),
}));

// Mock middleware
jest.mock('../middleware/context.middleware', () => ({
  contextMiddleware: jest.fn((req: any, res: any, next: any) => next()),
}));

jest.mock('../middleware/auth.middleware', () => ({
  authMiddleware: jest.fn((req: any, res: any, next: any) => next()),
}));

// Now import routes after mocks are set up
import { registerRoutes } from '../routes/routes';
import { registerOAuthRoutes } from '../routes/oauth.routes';

describe('Routes Module Tests', () => {
  let app: Express;
  let authService: AuthService;

  beforeEach(() => {
    resetAllMocks();
    app = express();
    app.use(express.json());
    authService = new AuthService();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Route Registration', () => {
    it('should register main routes without errors', () => {
      expect(() => {
        registerRoutes(app, authService);
      }).not.toThrow();
    });

    it('should register OAuth routes without errors', () => {
      expect(() => {
        registerOAuthRoutes(app, authService);
      }).not.toThrow();
    });

    it('should accept Express app and AuthService', () => {
      const result = registerRoutes(app, authService);
      expect(result).toBeUndefined(); // registerRoutes returns void
    });

    it('should accept Express app for OAuth routes', () => {
      const result = registerOAuthRoutes(app, authService);
      expect(result).toBeUndefined(); // registerOAuthRoutes returns void
    });
  });

  describe('Route Module Imports', () => {
    it('should import routes module successfully', async () => {
      const routesModule = await import('../routes/routes');
      expect(routesModule.registerRoutes).toBeDefined();
      expect(typeof routesModule.registerRoutes).toBe('function');
    });

    it('should import OAuth routes module successfully', async () => {
      const oauthModule = await import('../routes/oauth.routes');
      expect(oauthModule.registerOAuthRoutes).toBeDefined();
      expect(typeof oauthModule.registerOAuthRoutes).toBe('function');
    });
  });

  describe('Auth Service Integration', () => {
    it('should work with AuthService instance', () => {
      expect(authService).toBeDefined();
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should call routes with valid service', () => {
      expect(() => {
        registerRoutes(app, authService);
        registerOAuthRoutes(app, authService);
      }).not.toThrow();
    });
  });
});
