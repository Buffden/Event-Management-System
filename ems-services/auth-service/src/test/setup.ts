// src/test/setup.ts
import 'jest';
import {prisma} from '../database';

let rmq: { connect: () => Promise<void>; close: () => Promise<void> } | null = null;

// Common Jest setup hooks shared across tests
beforeAll(async () => {
    // Verify database connectivity
    await prisma.$connect();
    // Verify RabbitMQ connectivity (dynamic import after env is loaded)
    const mod = await import('../services/rabbitmq.service');
    rmq = mod.rabbitMQService;
    await rmq.connect();
});

afterAll(async () => {
    // Global cleanup
    await prisma.$disconnect();
    if (rmq) {
        await rmq.close();
    }
});

// Reduce noise from console.error in test output; override per-test if needed
const originalConsoleError = console.error;
beforeEach(() => {
    console.error = jest.fn();
});

afterEach(() => {
    console.error = originalConsoleError;
});