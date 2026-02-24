import { Router, Request, Response } from 'express';
import { KycService } from './kyc.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/kyc/status
 * Get the current user's KYC status
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        const status = await KycService.getKycStatus(req.user.id);
        return success(res, status);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return error(res, 'INTERNAL_ERROR', message);
    }
});

/**
 * POST /api/kyc/submit
 * Submit KYC data (IDs and Bank Details)
 */
router.post('/submit', async (req: Request, res: Response) => {
    try {
        const { idType, idNumber, idImageUrl, bankName, bankAccountNo, bankAccountName } = req.body;

        if (!idType || !idNumber) {
            return error(res, 'VALIDATION_ERROR', 'ID Type and ID Number are required', 400);
        }

        const result = await KycService.submitKyc(req.user!.id, {
            idType,
            idNumber,
            idImageUrl,
            bankName,
            bankAccountNo,
            bankAccountName
        });

        return success(res, result);
    } catch (err) {
        console.error('KYC submission error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        const code = (err as any).code || 'INTERNAL_ERROR';
        const statusCode = (err as any).statusCode || 500;
        return error(res, code, message, statusCode);
    }
});

export default router;
