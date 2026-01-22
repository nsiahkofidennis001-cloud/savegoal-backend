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
        const userId = req.body.user.id;
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
        const userId = req.body.user.id;
        const { name, targetAmount, deadline, description } = req.body;

        if (!name || !targetAmount) {
            return error(res, 'VALIDATION_ERROR', 'Name and target amount are required', 400);
        }

        const goal = await GoalsService.createGoal(userId, {
            name,
            targetAmount,
            deadline,
            description,
        });
        return success(res, goal, undefined, 201);
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
        const userId = req.body.user.id;
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
        const userId = req.body.user.id;
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

export default router;
