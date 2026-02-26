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
        const status = await KycService.getKycStatus(req.user!.id);
        return success(res, status);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * POST /api/kyc/submit
 * Submit KYC data (IDs, selfie, and Bank Details)
 */
router.post('/submit', async (req: Request, res: Response) => {
    try {
        const { idType, idNumber, idImageUrl, selfieImageUrl, bankName, bankAccountNo, bankAccountName } = req.body;

        if (!idType || !idNumber) {
            return error(res, 'VALIDATION_ERROR', 'ID Type and ID Number are required', 400);
        }

        const result = await KycService.submitKyc(req.user!.id, {
            idType,
            idNumber,
            idImageUrl,
            selfieImageUrl,
            bankName,
            bankAccountNo,
            bankAccountName
        });

        return success(res, result);
    } catch (err: any) {
        console.error('KYC submission error:', err);
        const code = err.code || 'INTERNAL_ERROR';
        const statusCode = err.statusCode || 500;
        return error(res, code, err.message, statusCode);
    }
});

/**
 * POST /api/kyc/selfie
 * Submit or resubmit selfie image only
 */
router.post('/selfie', async (req: Request, res: Response) => {
    try {
        const { selfieImageUrl } = req.body;

        if (!selfieImageUrl) {
            return error(res, 'VALIDATION_ERROR', 'selfieImageUrl is required', 400);
        }

        const result = await KycService.submitSelfie(req.user!.id, selfieImageUrl);
        return success(res, result);
    } catch (err: any) {
        console.error('Selfie submission error:', err);
        const code = err.code || 'INTERNAL_ERROR';
        const statusCode = err.statusCode || 500;
        return error(res, code, err.message, statusCode);
    }
});

export default router;
