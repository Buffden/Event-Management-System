/**
 * Setup Test - Verifies that the test environment is properly configured
 */

describe('Test Setup', () => {
  it('should have Jest globals available', () => {
    expect(jest).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have required environment variables', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.RABBITMQ_URL).toBeDefined();
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});
