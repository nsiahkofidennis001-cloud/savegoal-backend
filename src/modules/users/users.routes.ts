import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { success, error } from '../../shared/utils/response.util.js';
import { UsersService } from './users.service.js';

const router = Router();

router.use(requireAuth);

router.get('/me', async (req: Request, res: Response) => {
    try {
        const user = await UsersService.getCurrentUser(req.user!.id);
        return success(res, user);
    } catch (err: any) {
        return error(res, err.code || 'INTERNAL_ERROR', err.message, err.statusCode || 500);
    }
});

export default router;
