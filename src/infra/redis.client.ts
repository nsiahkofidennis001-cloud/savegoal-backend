import { Redis } from 'ioredis';
import { env } from '../config/env.config.js';

const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined;
};

export const redis =
    globalForRedis.redis ??
    new Redis(env.REDIS_URL as string, {
        maxRetriesPerRequest: 3,
    });

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

redis.on('connect', () => {
    console.info('✅ Redis connected');
});

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
}
