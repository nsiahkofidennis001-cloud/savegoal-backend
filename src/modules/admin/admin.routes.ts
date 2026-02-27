import { Router, Request, Response } from 'express';
import { AdminService } from './admin.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';

const router = Router();

// Apply Admin protection to all routes
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// ==================== DASHBOARD ====================

/**
 * GET /api/admin/dashboard
 * Enhanced dashboard statistics with KYC breakdown, trends, and activity
 */
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        const stats = await AdminService.getDashboardStats();
        return success(res, stats);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * GET /api/admin/stats
 * Get overall system statistics (legacy)
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
 * GET /api/admin/activity
 * Recent system activity feed
 */
router.get('/activity', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 30;
        const activity = await AdminService.getRecentActivity(limit);
        return success(res, activity);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

// ==================== USER MANAGEMENT ====================

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
 * GET /api/admin/users/search
 * Search users by name, email, phone with optional role/KYC filters
 */
router.get('/users/search', async (req: Request, res: Response) => {
    try {
        const query = (req.query.q as string) || '';
        const result = await AdminService.searchUsers(query, {
            role: req.query.role as string,
            kycStatus: req.query.kycStatus as string,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20
        });
        return success(res, result);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * GET /api/admin/users/:id
 * Get detailed user profile
 */
router.get('/users/:id', async (req: Request, res: Response) => {
    try {
        const detail = await AdminService.getUserDetail(req.params.id);
        return success(res, detail);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * PATCH /api/admin/users/:id/suspend
 * Suspend or unsuspend a user
 */
router.patch('/users/:id/suspend', async (req: Request, res: Response) => {
    try {
        const { suspend } = req.body;
        if (typeof suspend !== 'boolean') {
            return error(res, 'VALIDATION_ERROR', 'suspend (boolean) is required', 400);
        }
        const result = await AdminService.toggleUserSuspension(req.params.id, suspend);
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update user role (promote/demote)
 */
router.patch('/users/:id/role', async (req: Request, res: Response) => {
    try {
        const { role } = req.body;
        if (!role) {
            return error(res, 'VALIDATION_ERROR', 'role is required', 400);
        }
        const result = await AdminService.updateUserRole(req.params.id, role);
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

// ==================== MERCHANT MANAGEMENT ====================

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

// ==================== KYC MANAGEMENT ====================

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
 * GET /api/admin/kyc/all
 * List all KYC submissions with optional status filter
 */
router.get('/kyc/all', async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await AdminService.listAllKyc(status, page, limit);
        return success(res, result);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * GET /api/admin/kyc/:userId/detail
 * Get detailed KYC submission with ID and selfie images
 */
router.get('/kyc/:userId/detail', async (req: Request, res: Response) => {
    try {
        const detail = await AdminService.getKycDetail(req.params.userId);
        return success(res, detail);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
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
 * PATCH /api/admin/kyc/:userId/selfie
 * Approve or reject selfie specifically
 */
router.patch('/kyc/:userId/selfie', async (req: Request, res: Response) => {
    try {
        const { verified, matchScore, note } = req.body;
        if (typeof verified !== 'boolean') {
            return error(res, 'VALIDATION_ERROR', 'verified (boolean) is required', 400);
        }
        const result = await AdminService.reviewSelfie(
            req.params.userId,
            verified,
            matchScore,
            note
        );
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

// ==================== PAYOUTS ====================

/**
 * GET /api/admin/payouts/pending
 * List all pending merchant payout requests
 */
router.get('/payouts/pending', async (req: Request, res: Response) => {
    try {
        const pending = await AdminService.listPendingPayouts();
        return success(res, pending);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * PATCH /api/admin/payouts/:id/process
 * Approve or decline a merchant payout
 */
router.patch('/payouts/:id/process', async (req: Request, res: Response) => {
    try {
        const { status, note } = req.body;
        if (!['COMPLETED', 'FAILED'].includes(status)) {
            return error(res, 'VALIDATION_ERROR', 'Status must be COMPLETED or FAILED', 400);
        }
        const result = await AdminService.processPayout(req.params.id, status, note);
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

// ==================== TRANSACTIONS ====================

/**
 * GET /api/admin/transactions
 * Monitor all system transactions
 */
router.get('/transactions', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const result = await AdminService.getGlobalTransactions(page, limit, {
            type: req.query.type as string,
            status: req.query.status as string
        });
        return success(res, result);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

export default router;
