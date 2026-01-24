// Test setup file

beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://savegoal:savegoal_dev@127.0.0.1:5432/savegoal?schema=public';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-32ch';
    process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3000';
});
