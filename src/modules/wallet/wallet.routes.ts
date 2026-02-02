import { Router, Request, Response } from 'express';
import { WalletService } from './wallet.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = Router();

// Apply auth middleware to all wallet routes
router.use(requireAuth);

/**
 * GET /api/wallet
 * Get user's wallet balance
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id; // Injected by requireAuth/better-auth
        const wallet = await WalletService.getWallet(userId);
        return success(res, wallet);
    } catch (err: any) {
        console.error('Get wallet error:', err);
        return error(res, 'INTERNAL_ERROR', err.message || 'Failed to get wallet');
    }
});

/**
 * POST /api/wallet/deposit
 * Mock deposit for testing
 */
router.post('/deposit', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { amount } = req.body;

        if (!amount || typeof amount !== 'number') {
            return error(res, 'VALIDATION_ERROR', 'Valid amount is required', 400);
        }

        const result = await WalletService.deposit(userId, amount);
        return success(res, result);
    } catch (err: any) {
        console.error('Deposit error:', err);
        const code = err.code || 'INTERNAL_ERROR';
        const statusCode = err.statusCode || 500;
        return error(res, code, err.message, statusCode);
    }
});

export default router;
