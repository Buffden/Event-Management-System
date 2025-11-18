// Manual mock for database module to work with dynamic imports
// Create mock functions that can be accessed from tests
const mockUpdateMany = jest.fn();

export const prisma = {
  user: {
    updateMany: mockUpdateMany,
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
  account: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Export the mock function so tests can access it
(prisma as any).__mockUpdateMany = mockUpdateMany;

