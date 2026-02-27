import { Router, Request, Response } from 'express';
import { GoalsService } from './goals.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/goals
 * List all goals
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const goals = await GoalsService.getUserGoals(userId);
        return success(res, goals);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * POST /api/goals
 * Create new goal
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { name, targetAmount, deadline, description, productId, isRecurring, monthlyAmount, savingsDay, category } = req.body;

        if (!name) {
            return error(res, 'VALIDATION_ERROR', 'Name is required', 400);
        }

        const goal = await GoalsService.createGoal(userId, {
            name,
            targetAmount,
            deadline,
            description,
            productId,
            category,
            isRecurring,
            monthlyAmount,
            savingsDay
        });
        return success(res, goal, undefined, 201);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * PATCH /api/goals/:id/recurring
 * Update recurring settings
 */
router.patch('/:id/recurring', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const result = await GoalsService.updateRecurringSettings(userId, req.params.id, req.body);
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * GET /api/goals/:id
 * Get goal details
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const goal = await GoalsService.getGoal(userId, req.params.id);
        return success(res, goal);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * POST /api/goals/:id/fund
 * Fund a goal
 */
router.post('/:id/fund', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { amount } = req.body;

        if (!amount || typeof amount !== 'number') {
            return error(res, 'VALIDATION_ERROR', 'Valid amount is required', 400);
        }

        const result = await GoalsService.fundGoal(userId, req.params.id, amount);
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

/**
 * @swagger
 * /goals/{id}/redeem:
 *   post:
 *     summary: Redeem a COMPLETED goal to pay the merchant
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Goal redeemed successfully
 */
router.post('/:id/redeem', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const result = await GoalsService.redeemGoal(userId, req.params.id);
        return success(res, result);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

export default router;
