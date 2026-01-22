import { Request, Response, NextFunction } from 'express';
import { auth, User, Session } from './auth.js';
import { fromNodeHeaders } from 'better-auth/node';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: User;
            session?: Session;
        }
    }
}

/**
 * Middleware to require authentication
 * Attaches user and session to request object
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
        }

        req.user = session.user;
        req.session = session.session;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid or expired session',
            },
        });
    }
}

/**
 * Middleware to require specific roles
 * Must be used after requireAuth
 */
export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
        }

        const userRole = (req.user as unknown as { role?: string }).role || 'CONSUMER';

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions',
                },
            });
        }

        next();
    };
}
