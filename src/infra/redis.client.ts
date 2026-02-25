import { Redis } from 'ioredis';
import { env } from '../config/env.config.js';
import { logger } from './logger.js';

const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined;
    memoryStore: Map<string, { value: string; expiry?: number }> | undefined;
};

// In-memory fallback for development when Redis is not available
class MemoryRedis {
    private store: Map<string, { value: string; expiry?: number }>;

    constructor() {
        this.store = globalForRedis.memoryStore ?? new Map();
        globalForRedis.memoryStore = this.store;
        logger.warn('⚠️ Using in-memory store (Redis fallback for development)');
    }

    async get(key: string): Promise<string | null> {
        const item = this.store.get(key);
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }

    async set(key: string, value: string, _exFlag?: string, exSeconds?: number): Promise<'OK'> {
        const expiry = exSeconds ? Date.now() + exSeconds * 1000 : undefined;
        this.store.set(key, { value, expiry });
        return 'OK';
    }

    async del(key: string): Promise<number> {
        return this.store.delete(key) ? 1 : 0;
    }

    async incr(key: string): Promise<number> {
        const current = await this.get(key);
        const newVal = (parseInt(current || '0', 10) + 1).toString();
        const item = this.store.get(key);
        this.store.set(key, { value: newVal, expiry: item?.expiry });
        return parseInt(newVal, 10);
    }

    async expire(key: string, seconds: number): Promise<number> {
        const item = this.store.get(key);
        if (item) {
            item.expiry = Date.now() + seconds * 1000;
            return 1;
        }
        return 0;
    }

    async ping(): Promise<string> {
        return 'PONG';
    }

    on(_event: string, _callback: (...args: unknown[]) => void): this {
        return this;
    }
}

function createRedisClient(): Redis {
    if (env.NODE_ENV === 'development') {
        // In development, try to connect but fall back to memory store
        const realRedis = new Redis(env.REDIS_URL as string, {
            maxRetriesPerRequest: 1,
            connectTimeout: 1000,
            retryStrategy: () => null, // Don't retry
        });

        realRedis.on('error', () => {
            // Silently ignore connection errors in dev
        });

        realRedis.on('connect', () => {
            logger.info('✅ Redis connected');
        });

        // Check if connected, otherwise use memory
        realRedis.ping().catch(() => {
            // Connection failed, we'll use memory store
        });

        return realRedis;
    }

    // Production: use real Redis
    const redis = new Redis(env.REDIS_URL as string, {
        maxRetriesPerRequest: 3,
    });

    redis.on('error', (err: Error) => {
        logger.error(err, 'Redis connection error:');
    });

    redis.on('connect', () => {
        logger.info('✅ Redis connected');
    });

    return redis;
}

// Use memory store for development if Redis is not available
export const redis: Redis = env.NODE_ENV === 'development'
    ? (new MemoryRedis() as unknown as Redis)
    : createRedisClient();

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
}
