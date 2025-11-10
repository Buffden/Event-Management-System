/**
 * Comprehensive Test Suite for Auth Service
 *
 * Tests all authentication features including:
 * - User registration (USER and SPEAKER roles)
 * - Email verification
 * - Login
 * - Password reset flow
 * - Token validation
 * - Profile management
 * - Google OAuth
 * - Admin endpoints
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
  createMockJWT,
  setupSuccessfulRegistration,
  setupExistingUser,
  setupSuccessfulLogin,
  setupEmailVerification,
  setupAuthFailure,
  setupDatabaseError,
  setupRabbitMQError,
  resetAllMocks,
} from './mocks-simple';

import { AuthService } from '../services/auth.service';
import { Role } from '../../generated/prisma/index';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    resetAllMocks();
    // Mock $transaction to execute the callback immediately
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        user: mockPrisma.user,
        account: mockPrisma.account,
      };
      return await callback(mockTx);
    });
    authService = new AuthService();
  });

  afterEach(() => {
    resetAllMocks();
  });

  // ============================================================================
  // REGISTRATION TESTS
  // ============================================================================

  describe('register()', () => {
    it('should register a new USER successfully', async () => {
      const { mockUser, mockToken } = setupSuccessfulRegistration();

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: Role.USER,
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.account.create).toHaveBeenCalled();
      expect(mockRabbitMQService.sendMessage).toHaveBeenCalledWith(
        'notification.email',
        expect.objectContaining({
          type: 'ACCOUNT_VERIFICATION_EMAIL',
        })
      );
      expect(result.token).toBe(mockToken);
      expect(result.user).toBeDefined();
    });

    it('should register a new SPEAKER successfully and create speaker profile', async () => {
      const { mockUser, mockToken } = setupSuccessfulRegistration();
      const speakerUser = { ...mockUser, role: Role.SPEAKER };
      mockPrisma.user.create.mockResolvedValue(speakerUser);

      const result = await authService.register({
        email: 'speaker@example.com',
        password: 'password123',
        name: 'Speaker User',
        role: Role.SPEAKER,
      });

      expect(mockRabbitMQService.sendMessage).toHaveBeenCalledWith(
        'speaker.profile.create',
        expect.objectContaining({
          type: 'SPEAKER_PROFILE_CREATION',
          data: expect.objectContaining({
            userId: speakerUser.id,
            email: speakerUser.email,
          }),
        })
      );
      expect(result.token).toBe(mockToken);
    });

    it('should reject ADMIN role registration', async () => {
      await expect(
        authService.register({
          email: 'admin@example.com',
          password: 'password123',
          name: 'Admin User',
          role: Role.ADMIN,
        })
      ).rejects.toThrow('Only USER and SPEAKER roles are allowed for registration');
    });

    it('should reject registration for existing active user', async () => {
      setupExistingUser(true);

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should resend verification email for unverified user', async () => {
      const mockUser = createMockUser({
        isActive: false,
        emailVerified: null
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockRabbitMQService.sendMessage.mockResolvedValue(undefined);

      await expect(
        authService.register({
          email: 'unverified@example.com',
          password: 'password123',
          name: 'Unverified User',
        })
      ).rejects.toThrow('Verification email has been resent');

      expect(mockRabbitMQService.sendMessage).toHaveBeenCalledWith(
        'notification.email',
        expect.objectContaining({
          type: 'ACCOUNT_VERIFICATION_EMAIL',
        })
      );
    });

    it('should handle registration with database error', async () => {
      setupDatabaseError();

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should rollback user creation if email sending fails', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.account.create.mockResolvedValue(createMockAccount());
      mockBcrypt.hash.mockResolvedValue('hashed_password');
      mockJWT.sign.mockReturnValue('token');

      // Mock RabbitMQ failure
      setupRabbitMQError();
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
      ).rejects.toThrow('Could not send verification email');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should default to USER role when no role provided', async () => {
      const { mockUser, mockToken } = setupSuccessfulRegistration();

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        // No role provided
      });

      expect(result.user).toBeDefined();
      expect(result.user?.role).toBe('USER');
    });

    it('should handle undefined role in isValidRegistrationRole (returns true)', async () => {
      // Covers line 48: if (!role) return true;
      // This tests the branch where role is undefined, which should return true
      // and allow registration to proceed with default USER role
      const { mockUser, mockToken } = setupSuccessfulRegistration();

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: undefined, // Explicitly undefined
      });

      expect(result.user).toBeDefined();
      expect(result.user?.role).toBe('USER'); // Should default to USER
    });

    it('should handle null role in isValidRegistrationRole (returns true)', async () => {
      // Covers line 48: if (!role) return true;
      // This tests the branch where role is null, which should return true
      const { mockUser, mockToken } = setupSuccessfulRegistration();

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: null as any, // Explicitly null
      });

      expect(result.user).toBeDefined();
      expect(result.user?.role).toBe('USER'); // Should default to USER
    });
  });

  // ============================================================================
  // EMAIL VERIFICATION TESTS
  // ============================================================================

  describe('verifyEmail()', () => {
    it('should verify email and activate user successfully', async () => {
      const { mockUser, verifiedUser } = setupEmailVerification();

      const result = await authService.verifyEmail('mock.verification.token');

      expect(mockJWT.verify).toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          isActive: true,
          emailVerified: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user?.isActive).toBe(true);
    });

    it('should reject verification with invalid token type', async () => {
      mockJWT.verify.mockReturnValue({
        userId: 'user-123',
        type: 'invalid-type',
      });

      await expect(
        authService.verifyEmail('invalid.token')
      ).rejects.toThrow('Invalid verification link');
    });

    it('should reject verification for non-existent user', async () => {
      mockJWT.verify.mockReturnValue({
        userId: 'user-123',
        type: 'email-verification',
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.verifyEmail('valid.token')
      ).rejects.toThrow('Invalid verification link');
    });

    it('should reject verification if email already verified', async () => {
      mockJWT.verify.mockReturnValue({
        userId: 'user-123',
        type: 'email-verification',
      });
      const verifiedUser = createMockUser({
        isActive: true,
        emailVerified: new Date(),
      });
      mockPrisma.user.findUnique.mockResolvedValue(verifiedUser);

      await expect(
        authService.verifyEmail('token')
      ).rejects.toThrow('Invalid verification link');
    });

    it('should handle expired verification token', async () => {
      mockJWT.verify.mockImplementation(() => {
        const error: any = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await expect(
        authService.verifyEmail('expired.token')
      ).rejects.toThrow('Verification link has expired');
    });
  });

  // ============================================================================
  // LOGIN TESTS
  // ============================================================================

  describe('login()', () => {
    it('should login user successfully', async () => {
      const { mockUser, mockToken } = setupSuccessfulLogin();

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          accounts: {
            where: { provider: 'email' },
          },
        },
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.password
      );
      expect(result.token).toBe(mockToken);
      expect(result.user).toBeDefined();
    });

    it('should reject login for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('User does not exist');
    });

    it('should reject login for inactive user', async () => {
      const inactiveUser = createMockUser({
        isActive: false,
        accounts: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Your account is not active');
    });

    it('should reject login with incorrect password', async () => {
      const mockUser = createMockUser({
        isActive: true,
        emailVerified: new Date(),
        accounts: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Password Incorrect');
    });

    it('should create Account record for user without one', async () => {
      const mockUser = createMockUser({
        isActive: true,
        emailVerified: new Date(),
        accounts: [], // No account - this triggers the branch
      });
      const mockAccount = createMockAccount();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.sign.mockReturnValue('token');
      mockPrisma.account.create.mockResolvedValue(mockAccount);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Verify Account was created
      expect(mockPrisma.account.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          type: 'credentials',
          provider: 'email',
          providerAccountId: mockUser.email,
        },
      });

      // Verify login still succeeds
      expect(result.token).toBe('token');
      expect(result.user).toBeDefined();
    });

    it('should not create Account record when user already has accounts', async () => {
      // Covers the else branch: when accounts.length > 0, skip Account creation
      const mockAccount = createMockAccount();
      const mockUser = createMockUser({
        isActive: true,
        emailVerified: new Date(),
        accounts: [mockAccount], // User already has an account
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.sign.mockReturnValue('token');

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Verify Account was NOT created
      expect(mockPrisma.account.create).not.toHaveBeenCalled();

      // Verify login still succeeds
      expect(result.token).toBe('token');
      expect(result.user).toBeDefined();
    });

    it('should require email and password', async () => {
      await expect(
        authService.login({
          email: '',
          password: 'password123',
        })
      ).rejects.toThrow('Email and password are required');

      await expect(
        authService.login({
          email: 'test@example.com',
          password: '',
        })
      ).rejects.toThrow('Email and password are required');
    });
  });

  // ============================================================================
  // PASSWORD RESET TESTS
  // ============================================================================

  describe('forgotPassword()', () => {
    it('should send password reset email successfully', async () => {
      const mockUser = createMockUser({ isActive: true });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockJWT.sign.mockReturnValue('reset.token');
      mockRabbitMQService.sendMessage.mockResolvedValue(undefined);

      await authService.forgotPassword({ email: 'test@example.com' });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.any(Object),
      });
      expect(mockRabbitMQService.sendMessage).toHaveBeenCalledWith(
        'notification.email',
        expect.objectContaining({
          type: 'PASSWORD_RESET_EMAIL',
          message: expect.objectContaining({
            to: 'test@example.com',
          }),
        })
      );
    });

    it('should not reveal if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Should not throw error
      await expect(
        authService.forgotPassword({ email: 'nonexistent@example.com' })
      ).resolves.not.toThrow();

      expect(mockRabbitMQService.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send email for inactive user', async () => {
      const mockUser = createMockUser({ isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authService.forgotPassword({ email: 'test@example.com' });

      expect(mockRabbitMQService.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      const mockUser = createMockUser({ isActive: true });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      setupRabbitMQError();

      await expect(
        authService.forgotPassword({ email: 'test@example.com' })
      ).rejects.toThrow('Could not send password reset email');
    });
  });

  describe('verifyResetToken()', () => {
    it('should verify valid reset token', async () => {
      const mockUser = createMockUser({ isActive: true });
      mockJWT.verify.mockReturnValue({
        userId: mockUser.id,
        type: 'password-reset',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.verifyResetToken({ token: 'valid.token' });

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Token is valid.');
    });

    it('should reject invalid token type', async () => {
      mockJWT.verify.mockReturnValue({
        userId: 'user-123',
        type: 'email-verification',
      });

      const result = await authService.verifyResetToken({ token: 'invalid.token' });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid reset token.');
    });

    it('should reject token for inactive user', async () => {
      mockJWT.verify.mockReturnValue({
        userId: 'user-123',
        type: 'password-reset',
      });
      const mockUser = createMockUser({ isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.verifyResetToken({ token: 'token' });

      expect(result.valid).toBe(false);
    });

    it('should handle expired token', async () => {
      mockJWT.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      const result = await authService.verifyResetToken({ token: 'expired.token' });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid or expired reset token.');
    });
  });

  describe('resetPassword()', () => {
    it('should reset password successfully', async () => {
      const mockUser = createMockUser({ isActive: true });
      mockJWT.verify.mockReturnValue({
        userId: mockUser.id,
        type: 'password-reset',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.hash.mockResolvedValue('new_hashed_password');
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        password: 'new_hashed_password',
      });

      const result = await authService.resetPassword({
        token: 'valid.token',
        newPassword: 'newpassword123',
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: 'new_hashed_password' },
      });
      expect(result.message).toBe('Password has been reset successfully.');
    });

    it('should reject reset with invalid token', async () => {
      mockJWT.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        authService.resetPassword({
          token: 'invalid.token',
          newPassword: 'newpassword123',
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // TOKEN VALIDATION TESTS
  // ============================================================================

  describe('verifyToken()', () => {
    it('should verify valid token and return user', async () => {
      const mockUser = createMockUser();
      mockJWT.verify.mockReturnValue({ userId: mockUser.id });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.verifyToken('valid.token');

      expect(result.valid).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should return invalid for non-existent user', async () => {
      mockJWT.verify.mockReturnValue({ userId: 'non-existent' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.verifyToken('token');

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should return invalid for malformed token', async () => {
      mockJWT.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.verifyToken('malformed.token');

      expect(result.valid).toBe(false);
    });
  });

  describe('checkUserExists()', () => {
    it('should return true for existing user', async () => {
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await authService.checkUserExists('test@example.com');

      expect(result.exists).toBe(true);
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return false for non-existent user', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await authService.checkUserExists('nonexistent@example.com');

      expect(result.exists).toBe(false);
    });
  });

  // ============================================================================
  // PROFILE MANAGEMENT TESTS
  // ============================================================================

  describe('getProfile()', () => {
    it('should get user profile successfully', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.getProfile('user-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.getProfile('non-existent')
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile()', () => {
    it('should update user name and image', async () => {
      const mockUser = createMockUser();
      const updatedUser = { ...mockUser, name: 'Updated Name', image: 'new-image.jpg' };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await authService.updateProfile('user-123', {
        name: 'Updated Name',
        image: 'new-image.jpg',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'Updated Name',
          image: 'new-image.jpg',
        },
        select: expect.any(Object),
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should update password with correct current password', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('new_hashed_password');
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        password: 'new_hashed_password',
      });

      await authService.updateProfile('user-123', {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'oldpassword',
        mockUser.password
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'new_hashed_password',
          }),
        })
      );
    });

    it('should reject password change for OAuth users', async () => {
      const oAuthUser = createMockUser({ password: null });
      mockPrisma.user.findUnique.mockResolvedValue(oAuthUser);

      await expect(
        authService.updateProfile('user-123', {
          currentPassword: 'password',
          newPassword: 'newpassword',
        })
      ).rejects.toThrow('Password change not available for OAuth accounts');
    });

    it('should reject password change with incorrect current password', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.updateProfile('user-123', {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should require current password when changing password', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.updateProfile('user-123', {
          newPassword: 'newpassword',
        })
      ).rejects.toThrow('Current password is required');
    });

    it('should handle profile update for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.updateProfile('non-existent', {
          name: 'New Name',
        })
      ).rejects.toThrow('User not found');
    });
  });

  // ============================================================================
  // GOOGLE OAUTH TESTS
  // ============================================================================

  describe('findOrCreateGoogleUser()', () => {
    it('should return existing user with Google account', async () => {
      const mockUser = createMockUser();
      const mockAccount = createMockAccount({
        provider: 'google',
        providerAccountId: 'google-123',
      });

      mockPrisma.account.findUnique.mockResolvedValue({
        user: mockUser,
      });

      const profile: any = {
        id: 'google-123',
        emails: [{ value: 'test@example.com' }],
        displayName: 'Test User',
        photos: [{ value: 'photo.jpg' }],
      };

      const result = await authService.findOrCreateGoogleUser(profile);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: 'google-123',
          },
        },
        select: { user: { select: expect.any(Object) } },
      });
    });

    it('should link Google account to existing user', async () => {
      const mockUser = createMockUser();
      const mockAccount = createMockAccount({
        provider: 'google',
        providerAccountId: 'google-123',
      });

      mockPrisma.account.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.account.create.mockResolvedValue(mockAccount);

      const profile: any = {
        id: 'google-123',
        emails: [{ value: 'test@example.com' }],
        displayName: 'Test User',
      };

      const result = await authService.findOrCreateGoogleUser(profile);

      expect(mockPrisma.account.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'google-123',
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should create new user with Google account', async () => {
      const mockUser = createMockUser({
        email: 'new@example.com',
        name: 'New User',
        image: 'photo.jpg',
        isActive: true,
        emailVerified: expect.any(Date),
      });

      mockPrisma.account.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const profile: any = {
        id: 'google-123',
        emails: [{ value: 'new@example.com' }],
        displayName: 'New User',
        photos: [{ value: 'photo.jpg' }],
      };

      const result = await authService.findOrCreateGoogleUser(profile);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          name: 'New User',
          image: 'photo.jpg',
          role: 'USER',
          isActive: true,
          emailVerified: expect.any(Date),
          accounts: {
            create: {
              type: 'oauth',
              provider: 'google',
              providerAccountId: 'google-123',
            },
          },
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUser);
    });

    it('should reject Google profile without email', async () => {
      const profile: any = {
        id: 'google-123',
        displayName: 'Test User',
      };

      await expect(
        authService.findOrCreateGoogleUser(profile)
      ).rejects.toThrow('Google profile is missing an email address');
    });
  });

  // ============================================================================
  // SPEAKER PROFILE CREATION TESTS
  // ============================================================================

  describe('createSpeakerProfile()', () => {
    it('should send speaker profile creation message for SPEAKER role', async () => {
      const speakerUser = createMockUser({ role: Role.SPEAKER });
      mockRabbitMQService.sendMessage.mockResolvedValue(undefined);

      await authService.createSpeakerProfile(speakerUser);

      expect(mockRabbitMQService.sendMessage).toHaveBeenCalledWith(
        'speaker.profile.create',
        expect.objectContaining({
          type: 'SPEAKER_PROFILE_CREATION',
          data: expect.objectContaining({
            userId: speakerUser.id,
            email: speakerUser.email,
            isAvailable: true,
          }),
        })
      );
    });

    it('should not send message for non-SPEAKER roles', async () => {
      const regularUser = createMockUser({ role: Role.USER });

      await authService.createSpeakerProfile(regularUser);

      expect(mockRabbitMQService.sendMessage).not.toHaveBeenCalled();
    });

    it('should not throw error if speaker profile creation fails', async () => {
      const speakerUser = createMockUser({ role: Role.SPEAKER });
      setupRabbitMQError();

      // Should not throw
      await expect(
        authService.createSpeakerProfile(speakerUser)
      ).resolves.not.toThrow();
    });

    it('should handle catch block when RabbitMQ sendMessage throws error', async () => {
      // Covers lines 148-152: catch block that logs error but doesn't throw
      const speakerUser = createMockUser({ role: Role.SPEAKER });

      // Mock RabbitMQ to throw an error (not just reject)
      const rabbitMQError = new Error('RabbitMQ connection failed');
      mockRabbitMQService.sendMessage.mockRejectedValue(rabbitMQError);

      // Should not throw error - catch block should handle it gracefully
      await expect(
        authService.createSpeakerProfile(speakerUser)
      ).resolves.not.toThrow();

      // Verify that the error was logged (via mockLogger)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'createSpeakerProfile(): Failed to send speaker profile creation message',
        rabbitMQError,
        expect.objectContaining({
          userId: speakerUser.id,
        })
      );
    });

    it('should use default name when user.name is undefined in createSpeakerProfile', async () => {
      // Covers line 131: user.name || 'Speaker'
      const speakerUser = createMockUser({ role: Role.SPEAKER, name: null });
      mockRabbitMQService.sendMessage.mockResolvedValue(undefined);

      await authService.createSpeakerProfile(speakerUser);

      expect(mockRabbitMQService.sendMessage).toHaveBeenCalledWith(
        'speaker.profile.create',
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Speaker', // Should default to 'Speaker'
          }),
        })
      );
    });
  });

  // ============================================================================
  // JWT TOKEN GENERATION TESTS
  // ============================================================================

  describe('generateJwtForUser()', () => {
    it('should generate JWT token for user', () => {
      const mockUser = createMockUser();
      mockJWT.sign.mockReturnValue('generated.token');

      const token = authService.generateJwtForUser(mockUser);

      expect(mockJWT.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        },
        expect.any(String),
        { expiresIn: '30d' }
      );
      expect(token).toBe('generated.token');
    });
  });
});
