import { Router, Request, Response } from 'express';
import { PublicGoalsService } from './public-goals.service.js';
import { success, error } from '../../shared/utils/response.util.js';

const router = Router();

// ==================== PUBLIC GOALS ROUTES ====================

/**
 * @route GET /api/goals/public/:id
 * @desc Get public-facing details of a specific goal
 * @access Public
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const goal = await PublicGoalsService.getPublicGoalDetails(req.params.id);
        if (!goal) {
            return error(res, 'NOT_FOUND', 'Goal not found', 404);
        }
        return success(res, goal);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message, 500);
    }
});

/**
 * @route GET /api/goals/public/:id/contributions
 * @desc Get list of public contributions for a goal
 * @access Public
 */
router.get('/:id/contributions', async (req: Request, res: Response) => {
    try {
        const contributions = await PublicGoalsService.getGoalContributions(req.params.id);
        return success(res, contributions);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message, 500);
    }
});

/**
 * @route POST /api/goals/public/:id/contribute
 * @desc Initialize a public contribution via Paystack
 * @access Public
 */
router.post('/:id/contribute', async (req: Request, res: Response) => {
    try {
        const { amount, contributorName, contributorEmail, message } = req.body;

        if (!amount || amount <= 0) {
            return error(res, 'VALIDATION_ERROR', 'Amount must be greater than 0', 400);
        }
        if (!contributorName) {
            return error(res, 'VALIDATION_ERROR', 'Contributor name is required', 400);
        }

        const data = await PublicGoalsService.initializeContribution({
            goalId: req.params.id,
            amount: Number(amount),
            contributorName,
            contributorEmail,
            message
        });

        return success(res, data, undefined, 200);
    } catch (err: any) {
        if (err.message === 'Goal not found' || err.message === 'Goal is not active') {
            return error(res, 'BAD_REQUEST', err.message, 400);
        }
        return error(res, 'INTERNAL_ERROR', err.message, 500);
    }
});

export default router;
