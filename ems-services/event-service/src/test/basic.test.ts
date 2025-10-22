/**
 * Basic Test - Verifies that the test environment is working
 */

describe('Basic Test Setup', () => {
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
    expect(process.env.PORT).toBeDefined();
  });

  it('should be able to create mock objects', () => {
    const mockEvent = {
      id: 'test-123',
      title: 'Test Event',
      description: 'A test event',
    };
    
    expect(mockEvent.id).toBe('test-123');
    expect(mockEvent.title).toBe('Test Event');
  });
});
