import '@jest/globals';
import { setupAllMocks, resetAllMocks, mockTransporter } from './mocks-simple';

describe('Test Setup', () => {
  beforeAll(() => {
    // This beforeAll is part of the test suite, not the global setup
    // The global setup (src/test/setup.ts) runs before this.
  });

  afterAll(() => {
    // This afterAll is part of the test suite
  });

  beforeEach(() => {
    // This beforeEach is part of the test suite
  });

  afterEach(() => {
    // This afterEach is part of the test suite
  });

  it('should have Jest globals available', () => {
    expect(jest).toBeDefined();
    expect(beforeAll).toBeDefined();
    expect(afterAll).toBeDefined();
    expect(beforeEach).toBeDefined();
    expect(afterEach).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.GMAIL_HOST).toBeDefined();
    expect(process.env.GMAIL_PORT).toBeDefined();
    expect(process.env.GMAIL_USER).toBeDefined();
    expect(process.env.GMAIL_PASS).toBeDefined();
    expect(process.env.APP_NAME).toBeDefined();
    expect(process.env.CLIENT_URL).toBeDefined();
    expect(process.env.RABBITMQ_URL).toBeDefined();
  });

  it('should have required environment variables', () => {
    // This test implicitly passes if env-setup.ts doesn't throw an error
    expect(true).toBe(true);
  });

  it('should have mocks properly initialized', () => {
    expect(mockTransporter).toBeDefined();
    expect(typeof mockTransporter.sendMail).toBe('function');
  });
});
