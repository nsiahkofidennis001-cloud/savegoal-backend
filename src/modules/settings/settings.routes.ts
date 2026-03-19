import { Router, Request, Response } from 'express';
import { SettingsService } from './settings.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/settings/profile
 * Get current user's profile with notification preferences
 */
router.get('/profile', async (req: Request, res: Response) => {
    try {
        const profile = await SettingsService.getProfile(req.user!.id);
        return success(res, profile);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * PATCH /api/settings/profile
 * Update profile fields (name, phone, address, etc.)
 */
router.patch('/profile', async (req: Request, res: Response) => {
    try {
        const { name, phone, image, firstName, lastName, dateOfBirth, address, occupation, profilePic } = req.body;

        const result = await SettingsService.updateProfile(req.user!.id, {
            name, phone, image, firstName, lastName, dateOfBirth, address, occupation, profilePic
        });

        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * PATCH /api/settings/notifications
 * Update notification preferences
 */
router.patch('/notifications', async (req: Request, res: Response) => {
    try {
        const { notifyInApp, notifySms, notifyWhatsapp, notifyEmail } = req.body;

        const result = await SettingsService.updateNotificationPreferences(req.user!.id, {
            notifyInApp, notifySms, notifyWhatsapp, notifyEmail
        });

        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * DELETE /api/settings/account
 * Delete the current user's account
 */
router.delete('/account', async (req: Request, res: Response) => {
    try {
        const result = await SettingsService.deleteAccount(req.user!.id);
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * POST /api/settings/refund-request
 * Submit a refund request for a completed transaction
 */
router.post('/refund-request', async (req: Request, res: Response) => {
    try {
        const { transactionId, reason } = req.body;

        if (!transactionId || !reason) {
            return error(res, 'VALIDATION_ERROR', 'transactionId and reason are required', 400);
        }

        const result = await SettingsService.requestRefund(req.user!.id, transactionId, reason);
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

export default router;
