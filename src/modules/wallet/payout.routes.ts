import { Router, Request, Response } from 'express';
import { PayoutService } from './payout.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('MERCHANT'));

/**
 * POST /api/wallet/payouts/request
 * Request a payout (Merchant only)
 */
router.post('/request', async (req: Request, res: Response) => {
    try {
        const { amount } = req.body;
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return error(res, 'VALIDATION_ERROR', 'Valid positive amount is required', 400);
        }
        const result = await PayoutService.requestMerchantPayout(req.user!.id, amount);
        return success(res, result, undefined, 201);
    } catch (err: unknown) {
        const errObj = err as any;
        const code = errObj.code || 'INTERNAL_ERROR';
        const statusCode = errObj.statusCode || 500;
        return error(res, code, errObj.message, statusCode);
    }
});

export default router;
