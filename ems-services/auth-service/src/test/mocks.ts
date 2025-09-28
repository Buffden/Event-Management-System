// src/test/mocks.ts
// Common mocks for all tests

// Mock the database module with comprehensive Prisma methods
export const mockPrisma: any = {
    user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    account: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
};

// Set up the transaction mock after mockPrisma is defined
mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));

// Mock RabbitMQ service
export const mockRabbitMQService = {
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    sendMessage: jest.fn().mockResolvedValue(undefined),
};

// Mock JWT
export const mockJWT = {
    sign: jest.fn(),
    verify: jest.fn(),
};

// Mock bcrypt
export const mockBcrypt = {
    hash: jest.fn(),
    compare: jest.fn(),
};

// Mock logger
export const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};

// Setup all mocks
export const setupAllMocks = () => {
    // Mock database
    jest.doMock('../database', () => ({
        prisma: mockPrisma,
    }));

    // Mock RabbitMQ service
    jest.doMock('../services/rabbitmq.service', () => ({
        rabbitMQService: mockRabbitMQService,
        EmailNotification: {},
    }));

    // Mock jsonwebtoken
    jest.doMock('jsonwebtoken', () => mockJWT);

    // Mock bcryptjs
    jest.doMock('bcryptjs', () => mockBcrypt);

    // Mock logger
    jest.doMock('../utils/logger', () => ({
        logger: mockLogger,
    }));
};

// Reset all mocks
export const resetAllMocks = () => {
    Object.values(mockPrisma.user).forEach((mock: any) => mock.mockReset());
    Object.values(mockPrisma.account).forEach((mock: any) => mock.mockReset());
    mockPrisma.$transaction.mockReset();
    mockPrisma.$connect.mockReset();
    mockPrisma.$disconnect.mockReset();

    Object.values(mockRabbitMQService).forEach((mock: any) => mock.mockReset());
    Object.values(mockJWT).forEach((mock: any) => mock.mockReset());
    Object.values(mockBcrypt).forEach((mock: any) => mock.mockReset());
    Object.values(mockLogger).forEach((mock: any) => mock.mockReset());
};

// Common mock data
export const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashed_password_123',
    name: 'John Doe',
    role: 'USER' as const,
    isActive: false,
    emailVerified: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

export const mockAccount = {
    id: 'account-123',
    userId: 'user-123',
    type: 'credentials',
    provider: 'email',
    providerAccountId: 'test@example.com',
};

export const mockToken = 'mock.jwt.token';
export const mockVerificationToken = 'mock.verification.token';

// Helper functions for common test scenarios
export const setupSuccessfulRegistration = () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
    mockPrisma.user.create.mockResolvedValue(mockUser);
    mockPrisma.account.create.mockResolvedValue(mockAccount);
    mockBcrypt.hash.mockResolvedValue('hashed_password_123');
    mockJWT.sign.mockReturnValue(mockToken);
    mockRabbitMQService.sendMessage.mockResolvedValue(undefined);
};

export const setupExistingUser = () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
};

export const setupSuccessfulLogin = () => {
    const userWithPassword = {
        ...mockUser,
        isActive: true,
        emailVerified: new Date('2024-01-02'),
        accounts: [mockAccount],
    };
    mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);
    mockBcrypt.compare.mockResolvedValue(true);
    mockJWT.sign.mockReturnValue(mockToken);
};

export const setupEmailVerification = () => {
    mockJWT.verify.mockReturnValue({
        userId: mockUser.id,
        type: 'email-verification'
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const verifiedUser = {
        ...mockUser,
        isActive: true,
        emailVerified: new Date('2024-01-02'),
    };
    mockPrisma.user.update.mockResolvedValue(verifiedUser);
    mockJWT.sign.mockReturnValue(mockToken);
};
