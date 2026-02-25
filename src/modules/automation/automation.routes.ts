import { Router, Request, Response } from 'express';
import { AutomationService } from './automation.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { logger } from '../../infra/logger.js';

const router = Router();

/**
 * POST /api/automation/process-monthly
 * Manually trigger the monthly savings processing
 * Restricted to ADMIN for security
 */
router.post('/process-monthly', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
        const result = await AutomationService.processMonthlySavings();
        return success(res, result);
    } catch (err: unknown) {
        const errObj = err as Error;
        logger.error(errObj, 'Automation processing error:');
        return error(res, 'INTERNAL_ERROR', errObj.message);
    }
});

/**
 * POST /api/automation/run-daily
 * Trigger daily automated savings (Internal/Cron only)
 */
router.post('/run-daily', async (req: Request, res: Response) => {
    try {
        // Basic security: Check for a secret token in headers
        const authHeader = req.headers['authorization'];
        if (authHeader !== `Bearer ${process.env.INTERNAL_CRON_SECRET}`) {
            return error(res, 'UNAUTHORIZED', 'Unauthorized');
        }

        // Assuming processMonthlySavings is the intended method based on the provided snippet
        // If there's a separate daily processing, this should be updated accordingly.
        const results = await AutomationService.processMonthlySavings();
        return success(res, results);
    } catch (err: unknown) {
        const errObj = err as Error;
        logger.error(errObj, 'Automation daily run error:');
        return error(res, 'INTERNAL_ERROR', errObj.message);
    }
});

export default router;
