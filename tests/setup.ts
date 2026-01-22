// Test setup file

beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-32ch';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';
});

afterAll(async () => {
    // Cleanup after tests
});

export { };
