import { Router, Request, Response } from 'express';
import { NotificationService } from './notification.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/notifications
 * List notifications for the current user
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const notifications = await NotificationService.list(req.user!.id, limit, offset);
        const unreadCount = await NotificationService.getUnreadCount(req.user!.id);

        return success(res, {
            notifications,
            unreadCount
        });
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
    try {
        await NotificationService.markAsRead(req.params.id, req.user!.id);
        return success(res, { message: 'Notification marked as read' });
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', async (req: Request, res: Response) => {
    try {
        await NotificationService.markAllAsRead(req.user!.id);
        return success(res, { message: 'All notifications marked as read' });
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

export default router;
