import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { CONSTANTS } from '../../config/constants.js';
import { redis } from '../../infra/redis.client.js';

/**
 * Standard rate limiter (100 req/min)
 * Using in-memory store for simplicity. For production, consider Redis store.
 */
export const standardLimiter = rateLimit({
    windowMs: CONSTANTS.RATE_LIMIT_WINDOW_MS,
    max: CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        // @ts-expect-error - Typing mismatch between ioredis and rate-limit-redis
        sendCommand: (...args: string[]) => redis.call(...args),
    }),
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests, please try again later.',
        },
    },
});

/**
 * Strict rate limiter for auth endpoints (10 req/min)
 */
export const authLimiter = rateLimit({
    windowMs: CONSTANTS.RATE_LIMIT_WINDOW_MS,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        // @ts-expect-error - Typing mismatch between ioredis and rate-limit-redis
        sendCommand: (...args: string[]) => redis.call(...args),
    }),
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many authentication attempts, please try again later.',
        },
    },
});
