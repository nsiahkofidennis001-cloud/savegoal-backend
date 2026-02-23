import { Router, Request, Response } from 'express';
import { AdminService } from './admin.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';

const router = Router();

// Apply Admin protection to all routes in this file
router.use(requireAuth);
router.use(requireRole('ADMIN'));

/**
 * GET /api/admin/stats
 * Get overall system statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = await AdminService.getSystemStats();
        return success(res, stats);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * GET /api/admin/users
 * List all users (paginated)
 */
router.get('/users', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await AdminService.listUsers(page, limit);
        return success(res, result);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * GET /api/admin/merchants
 * List all merchant profiles
 */
router.get('/merchants', async (req: Request, res: Response) => {
    try {
        const merchants = await AdminService.listMerchants();
        return success(res, merchants);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * PATCH /api/admin/merchants/:id/verify
 * Update merchant verification status
 */
router.patch('/merchants/:id/verify', async (req: Request, res: Response) => {
    try {
        const { isVerified } = req.body;
        if (typeof isVerified !== 'boolean') {
            return error(res, 'VALIDATION_ERROR', 'isVerified (boolean) is required', 400);
        }
        const result = await AdminService.verifyMerchant(req.params.id, isVerified);
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * GET /api/admin/kyc/pending
 * List all pending KYC submissions
 */
router.get('/kyc/pending', async (req: Request, res: Response) => {
    try {
        const pending = await AdminService.listPendingKyc();
        return success(res, pending);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * PATCH /api/admin/kyc/:userId/verify
 * Approve or decline KYC
 */
router.patch('/kyc/:userId/verify', async (req: Request, res: Response) => {
    try {
        const { status, note } = req.body;
        if (!['VERIFIED', 'FAILED'].includes(status)) {
            return error(res, 'VALIDATION_ERROR', 'Status must be VERIFIED or FAILED', 400);
        }
        const result = await AdminService.verifyKyc(req.params.userId, status, note);
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * GET /api/admin/transactions
 * Monitor all system transactions
 */
router.get('/transactions', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const result = await AdminService.getGlobalTransactions(page, limit);
        return success(res, result);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

export default router;
