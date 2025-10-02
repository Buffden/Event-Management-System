// src/services/__test__/auth.service.test.ts
import { AuthService } from '../auth.service';
import {
    mockPrisma,
    mockRabbitMQService,
    mockJWT,
    mockBcrypt,
    mockUser,
    mockAccount,
    mockToken,
    mockVerificationToken,
    setupSuccessfulRegistration,
    setupExistingUser,
    setupSuccessfulLogin,
    setupEmailVerification,
} from '../../test/mocks';

describe('AuthService (unit)', () => {
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService();
    });

    describe('register', () => {
        it('should register a new user and return user with token', async () => {
            const registerData = {
                email: 'newuser@example.com',
                password: 'Password123!',
                name: 'Jane Doe',
                role: 'USER' as const,
            };

            const createdUser = {
                ...mockUser,
                id: 'user-456',
                email: registerData.email,
                name: registerData.name,
            };

            // Setup mocks for successful registration
            mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
            mockPrisma.user.create.mockResolvedValue(createdUser);
            mockPrisma.account.create.mockResolvedValue(mockAccount);
            mockBcrypt.hash.mockResolvedValue('hashed_password_123');
            mockJWT.sign.mockReturnValue(mockToken);
            mockRabbitMQService.sendMessage.mockResolvedValue(undefined);

            // Mock the transaction to return the created user
            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    user: {
                        create: mockPrisma.user.create,
                    },
                    account: {
                        create: mockPrisma.account.create,
                    }
                };
                return await callback(tx);
            });

            const result = await authService.register(registerData);

            // Assertions
            expect(result.user?.email).toBe(registerData.email);
            expect(result.user?.name).toBe(registerData.name);
            expect(result.token).toBe(mockToken);

            // Verify Prisma was called correctly
            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: registerData.email }
            });

            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    email: registerData.email,
                    password: 'hashed_password_123',
                    name: registerData.name,
                    role: registerData.role,
                    isActive: false,
                }),
                select: expect.any(Object)
            });

            // Verify password was hashed
            expect(mockBcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);

            // Verify JWT was created
            expect(mockJWT.sign).toHaveBeenCalledWith(
                expect.objectContaining({ userId: createdUser.id }),
                expect.any(String),
                expect.any(Object)
            );

            // Verify RabbitMQ message was sent
            expect(mockRabbitMQService.sendMessage).toHaveBeenCalledWith(
                'notification.email',
                expect.objectContaining({
                    type: 'EMAIL',
                    message: expect.objectContaining({
                        to: registerData.email,
                        subject: expect.stringContaining('Verify Your Email Address')
                    })
                })
            );
        });

        it('should throw error if user already exists and is active', async () => {
            const registerData = {
                email: mockUser.email,
                password: 'Password123!',
                name: 'Jane Doe',
                role: 'USER' as const,
            };

            const activeUser = {
                ...mockUser,
                isActive: true,
                emailVerified: new Date('2024-01-02'),
            };

            // Mock existing active user
            mockPrisma.user.findUnique.mockResolvedValue(activeUser);

            await expect(authService.register(registerData)).rejects.toThrow('User with this email already exists.');

            // Verify create was not called
            expect(mockPrisma.user.create).not.toHaveBeenCalled();
        });

        it('should resend verification email for existing unverified user', async () => {
            const registerData = {
                email: mockUser.email,
                password: 'Password123!',
                name: 'Jane Doe',
                role: 'USER' as const,
            };

            // Mock existing unverified user
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockJWT.sign.mockReturnValue(mockVerificationToken);
            mockRabbitMQService.sendMessage.mockResolvedValue(undefined);

            await expect(authService.register(registerData)).rejects.toThrow('Verification email has been resent. Please check your inbox.');

            // Verify verification email was sent
            expect(mockRabbitMQService.sendMessage).toHaveBeenCalledWith(
                'notification.email',
                expect.objectContaining({
                    type: 'EMAIL',
                    message: expect.objectContaining({
                        to: mockUser.email,
                        subject: expect.stringContaining('Verify Your Email Address')
                    })
                })
            );
        });

        it('should throw error for invalid registration role', async () => {
            const registerData = {
                email: 'admin@example.com',
                password: 'Password123!',
                name: 'Admin User',
                role: 'ADMIN' as const, // ADMIN role not allowed for registration
            };

            await expect(authService.register(registerData)).rejects.toThrow('Only USER and SPEAKER roles are allowed for registration');
        });

        it('should throw error if user already exists and is suspended', async () => {
            const registerData = {
                email: mockUser.email,
                password: 'Password123!',
                name: 'Jane Doe',
                role: 'USER' as const,
            };

            const suspendedUser = {
                ...mockUser,
                isActive: false,
                emailVerified: new Date('2024-01-02'),
            };

            mockPrisma.user.findUnique.mockResolvedValue(suspendedUser);

            await expect(authService.register(registerData)).rejects.toThrow('Your account has been suspended. Please contact support.');
        });

        // Simulate downtime of RabbitMQ should throw sendVerificationEmail(): Failed to publish verification email message. Rolling back user creation
        it('should throw error if RabbitMQ is down', async () => {
            const registerData = {
                email: 'newuser@example.com',
                password: 'Password123!',
                name: 'Jane Doe',
                role: 'USER' as const,
            };

            const createdUser = {
                ...mockUser,
                id: 'user-456',
                email: registerData.email,
                name: registerData.name,
            };

            // Setup mocks for successful registration
            mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
            mockPrisma.user.create.mockResolvedValue(createdUser);
            mockPrisma.account.create.mockResolvedValue(mockAccount);
            mockBcrypt.hash.mockResolvedValue('hashed_password_123');
            mockJWT.sign.mockReturnValue(mockToken);
            // RabbitMQ service should throw an error at await rabbitMQService.sendMessage(queueName, msg); in sendVerificationEmail()
            mockRabbitMQService.sendMessage.mockRejectedValue(new Error('RabbitMQ is down'));

            // Mock the transaction to return the created user
            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    user: {
                        create: mockPrisma.user.create,
                    },
                    account: {
                        create: mockPrisma.account.create,
                    }
                };
                return await callback(tx);
            });

            await expect(authService.register(registerData)).rejects.toThrow('Could not send verification email. Your registration has been cancelled.');

        });
    });

    describe('verifyEmail', () => {
        it('should verify email and activate user account', async () => {
            const inactiveUser = {
                ...mockUser,
                isActive: false,
                emailVerified: null,
            };

            const verifiedUser = {
                ...mockUser,
                isActive: true,
                emailVerified: new Date('2024-01-02'),
            };

            // Setup mocks for email verification
            mockJWT.verify.mockReturnValue({
                userId: mockUser.id,
                type: 'email-verification'
            });
            mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);
            mockPrisma.user.update.mockResolvedValue(verifiedUser);
            mockJWT.sign.mockReturnValue(mockToken);

            const result = await authService.verifyEmail(mockVerificationToken);

            // Assertions
            expect(result.user?.isActive).toBe(true);
            expect(result.user?.emailVerified).toBeTruthy();
            expect(result.token).toBe(mockToken);

            // Verify JWT was verified with correct secret
            expect(mockJWT.verify).toHaveBeenCalledWith(
                mockVerificationToken,
                process.env.EMAIL_VERIFICATION_SECRET
            );

            // Verify user was updated
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUser.id },
                data: {
                    isActive: true,
                    emailVerified: expect.any(Date),
                },
                select: expect.any(Object)
            });
        });

        it('should throw error for invalid verification token', async () => {
            // Mock JWT verification to throw error
            mockJWT.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await expect(authService.verifyEmail('invalid.token')).rejects.toThrow('Invalid verification link.');

            // Verify update was not called
            expect(mockPrisma.user.update).not.toHaveBeenCalled();
        });

        it('should throw error if user not found', async () => {
            mockJWT.verify.mockReturnValue({
                userId: 'non-existent-user',
                type: 'email-verification'
            });

            mockPrisma.user.findUnique.mockResolvedValue(null);

            await expect(authService.verifyEmail(mockVerificationToken)).rejects.toThrow('Invalid verification link.');
        });

        it('should throw error if email already verified', async () => {
            const alreadyVerifiedUser = {
                ...mockUser,
                isActive: true,
                emailVerified: new Date('2024-01-02'),
            };

            mockJWT.verify.mockReturnValue({
                userId: mockUser.id,
                type: 'email-verification'
            });
            mockPrisma.user.findUnique.mockResolvedValue(alreadyVerifiedUser);

            await expect(authService.verifyEmail(mockVerificationToken)).rejects.toThrow('Invalid verification link.');
        });
    });

    describe('login', () => {
        it('should login active user with correct credentials', async () => {
            const loginData = {
                email: mockUser.email,
                password: 'Password123!',
            };

            const activeUser = {
                ...mockUser,
                isActive: true,
                emailVerified: new Date('2024-01-02'),
                accounts: [mockAccount],
            };

            // Setup mocks for successful login
            mockPrisma.user.findUnique.mockResolvedValue(activeUser);
            mockBcrypt.compare.mockResolvedValue(true);
            mockJWT.sign.mockReturnValue(mockToken);

            const result = await authService.login(loginData);

            // Assertions
            expect(result.user?.email).toBe(loginData.email);
            expect(result.token).toBe(mockToken);
            // Password should be omitted from the result

            // Verify password was compared
            expect(mockBcrypt.compare).toHaveBeenCalledWith(loginData.password, activeUser.password);

            // Verify JWT was created
            expect(mockJWT.sign).toHaveBeenCalledWith(
                expect.objectContaining({ userId: activeUser.id }),
                expect.any(String),
                expect.any(Object)
            );
        });

        it('should throw error for non-existent user', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'Password123!',
            };

            mockPrisma.user.findUnique.mockResolvedValue(null);

            await expect(authService.login(loginData)).rejects.toThrow('Invalid email or password.');
        });

        it('should throw error for incorrect password', async () => {
            const loginData = {
                email: mockUser.email,
                password: 'WrongPassword123!',
            };

            const userWithPassword = {
                ...mockUser,
                isActive: true, // Make sure user is active
                emailVerified: new Date('2024-01-02'),
                accounts: [mockAccount],
            };

            mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);
            mockBcrypt.compare.mockResolvedValue(false);

            await expect(authService.login(loginData)).rejects.toThrow('Login failed: Invalid email or password.');
        });

        it('should throw error for inactive user', async () => {
            const loginData = {
                email: mockUser.email,
                password: 'Password123!',
            };

            const inactiveUser = {
                ...mockUser,
                isActive: false,
                accounts: [mockAccount],
            };

            mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);
            mockBcrypt.compare.mockResolvedValue(true);

            await expect(authService.login(loginData)).rejects.toThrow('Your account is not active. Please verify your email first.');
        });

        it('should create account record for backward compatibility', async () => {
            const loginData = {
                email: mockUser.email,
                password: 'Password123!',
            };

            const userWithoutAccount = {
                ...mockUser,
                isActive: true,
                emailVerified: new Date('2024-01-02'),
                accounts: [], // No account record
            };

            mockPrisma.user.findUnique.mockResolvedValue(userWithoutAccount);
            mockBcrypt.compare.mockResolvedValue(true);
            mockJWT.sign.mockReturnValue(mockToken);
            mockPrisma.account.create.mockResolvedValue(mockAccount);

            const result = await authService.login(loginData);

            // Verify account was created
            expect(mockPrisma.account.create).toHaveBeenCalledWith({
                data: {
                    userId: mockUser.id,
                    type: 'credentials',
                    provider: 'email',
                    providerAccountId: mockUser.email,
                }
            });

            expect(result.token).toBe(mockToken);
        });
    });

    describe('integration flow', () => {
        it('should complete full registration, verification, and login flow', async () => {
            const userData = {
                email: 'integration@example.com',
                password: 'SecurePass123!',
                name: 'Integration User',
                role: 'USER' as const,
            };

            // Step 1: Register
            const newUser = {
                ...mockUser,
                id: 'user-789',
                email: userData.email,
                name: userData.name,
                isActive: false,
                emailVerified: null,
            };

            mockPrisma.user.findUnique.mockResolvedValueOnce(null);
            mockPrisma.user.create.mockResolvedValue(newUser);
            mockPrisma.account.create.mockResolvedValue(mockAccount);
            mockBcrypt.hash.mockResolvedValue('hashed_password_123');
            mockJWT.sign.mockReturnValue(mockToken);
            mockRabbitMQService.sendMessage.mockResolvedValue(undefined);

            // Mock the transaction to return the created user
            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    user: {
                        create: mockPrisma.user.create,
                    },
                    account: {
                        create: mockPrisma.account.create,
                    }
                };
                return await callback(tx);
            });

            const registerResult = await authService.register(userData);
            expect(registerResult.user?.email).toBe(userData.email);
            expect(registerResult.user?.isActive).toBe(false);

            // Step 2: Verify Email
            const verifiedUser = {
                ...newUser,
                isActive: true,
                emailVerified: new Date(),
            };

            mockJWT.verify.mockReturnValue({
                userId: newUser.id,
                type: 'email-verification'
            });
            mockPrisma.user.findUnique.mockResolvedValueOnce(newUser);
            mockPrisma.user.update.mockResolvedValue(verifiedUser);

            const verifyResult = await authService.verifyEmail(mockVerificationToken);
            expect(verifyResult.user?.isActive).toBe(true);
            expect(verifyResult.user?.emailVerified).toBeTruthy();

            // Step 3: Login
            const userWithAccount = {
                ...verifiedUser,
                accounts: [mockAccount],
            };
            mockPrisma.user.findUnique.mockResolvedValueOnce(userWithAccount);
            mockBcrypt.compare.mockResolvedValue(true);

            const loginResult = await authService.login({
                email: userData.email,
                password: userData.password,
            });
            expect(loginResult.token).toBe(mockToken);
            expect(loginResult.user?.email).toBe(userData.email);
        });
    });

    describe('additional methods', () => {
        it('should check if user exists', async () => {
            mockPrisma.user.count.mockResolvedValue(1);

            const result = await authService.checkUserExists('test@example.com');
            expect(result.exists).toBe(true);
            expect(mockPrisma.user.count).toHaveBeenCalledWith({
                where: { email: 'test@example.com' }
            });
        });

        it('should verify JWT token', async () => {
            const user = { ...mockUser };
            mockJWT.verify.mockReturnValue({ userId: mockUser.id });
            mockPrisma.user.findUnique.mockResolvedValue(user);

            const result = await authService.verifyToken(mockToken);
            expect(result.valid).toBe(true);
            expect(result.user).toEqual(user);
        });

        it('should get user profile', async () => {
            const user = { ...mockUser };
            mockPrisma.user.findUnique.mockResolvedValue(user);

            const result = await authService.getProfile(mockUser.id);
            expect(result).toEqual(user);
            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: mockUser.id },
                select: expect.any(Object)
            });
        });

        it('should update user profile', async () => {
            const user = { ...mockUser };
            const updateData = { name: 'Updated Name' };
            const updatedUser = { ...user, name: 'Updated Name' };

            mockPrisma.user.findUnique.mockResolvedValue(user);
            mockPrisma.user.update.mockResolvedValue(updatedUser);

            const result = await authService.updateProfile(mockUser.id, updateData);
            expect(result.name).toBe('Updated Name');
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUser.id },
                data: { name: 'Updated Name' },
                select: expect.any(Object)
            });
        });
    });
});