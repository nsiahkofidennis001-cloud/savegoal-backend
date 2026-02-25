import { Router, Request, Response } from 'express';
import { prisma } from '../../../infra/prisma.client.js';
import { redis } from '../../../infra/redis.client.js';
import { success, error } from '../../../shared/utils/response.util.js';
import { logger } from '../../../infra/logger.js';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (_req: Request, res: Response) => {
    return success(res, { status: 'ok', uptime: process.uptime() });
});

/**
 * GET /health/db
 * Database connectivity check
 */
router.get('/db', async (_req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return success(res, { status: 'ok', database: 'connected' });
    } catch (err) {
        logger.error(err as Error, 'Database health check failed:');
        return error(res, 'DB_ERROR', 'Database connection failed', 503);
    }
});

/**
 * GET /health/redis
 * Redis connectivity check
 */
router.get('/redis', async (_req: Request, res: Response) => {
    try {
        const pong = await redis.ping();
        if (pong === 'PONG') {
            return success(res, { status: 'ok', redis: 'connected' });
        }
        return error(res, 'REDIS_ERROR', 'Redis ping failed', 503);
    } catch (err) {
        logger.error(err as Error, 'Redis health check failed:');
        return error(res, 'REDIS_ERROR', 'Redis connection failed', 503);
    }
});

export default router;
