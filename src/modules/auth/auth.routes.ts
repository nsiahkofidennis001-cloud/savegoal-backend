import { Router, Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.js';

const router = Router();

// Mount better-auth handler for all /api/auth/* routes
router.all('/api/auth/*', (req: Request, res: Response) => {
    return toNodeHandler(auth)(req, res);
});

export default router;
