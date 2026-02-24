import { Router, Request, Response } from 'express';
import { AutomationService } from './automation.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';

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
    } catch (err: any) {
        console.error('Automation processing error:', err);
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

export default router;
