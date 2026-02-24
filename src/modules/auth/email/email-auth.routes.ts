import { Router, Request, Response } from 'express';
import { auth } from '../auth.js';
import { prisma } from '../../../infra/prisma.client.js';
import { WalletService } from '../../wallet/wallet.service.js';
import { CONSTANTS } from '../../../config/constants.js';

const router = Router();

/**
 * POST /api/auth/email/signup
 * Register with email and password
 */
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const { email, password, name, phone } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Email, password, and name are required' },
            });
        }

        // 1. Create user using better-auth
        const authResponse = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
                phone, // Optional additional field
            },
        });

        if (!authResponse || !authResponse.user) {
            return res.status(500).json({
                success: false,
                error: { code: 'AUTH_ERROR', message: 'Failed to create user' },
            });
        }

        const user = authResponse.user;
        const sessionData = (authResponse as any).session || {
            token: (authResponse as any).token,
            expiresAt: new Date(Date.now() + CONSTANTS.SESSION_EXPIRY_SECONDS * 1000)
        };

        if (!sessionData.token) {
            console.error('Debug: authResponse missing session and token. Keys present:', Object.keys(authResponse));
            return res.status(500).json({
                success: false,
                error: { code: 'AUTH_ERROR', message: 'Failed to create user session' },
            });
        }

        // 2. Auto-create wallet for the new user
        try {
            await WalletService.createWallet(user.id);
        } catch (walletError) {
            console.error('Failed to create wallet for new user:', walletError);
            // Non-fatal, wallet can be created later on demand
        }

        // 3. Return response in same format as phone-otp
        return res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: (user as any).phone,
                    role: (user as any).role,
                },
                session: {
                    token: sessionData.token,
                    expiresAt: sessionData.expiresAt,
                },
            },
        });
    } catch (error: any) {
        console.error('Email signup error:', error);

        // Handle better-auth errors (often throws APIError)
        const message = error.body?.message || error.message || 'Failed to sign up';
        const code = error.body?.code || 'INTERNAL_ERROR';

        // Ensure status is a number (Express crashes on string statuses like 'UNPROCESSABLE_ENTITY')
        let status = error.status;
        if (status === 'UNPROCESSABLE_ENTITY') status = 422;
        if (typeof status !== 'number') status = 500;

        return res.status(status).json({
            success: false,
            error: { code, message },
        });
    }
});

/**
 * POST /api/auth/email/signin
 * Login with email and password
 */
router.post('/signin', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
            });
        }

        // 1. Sign in using better-auth
        const authResponse = await auth.api.signInEmail({
            body: {
                email,
                password,
            },
        });

        const user = authResponse.user;
        const sessionData = (authResponse as any).session || {
            token: (authResponse as any).token,
            expiresAt: new Date(Date.now() + CONSTANTS.SESSION_EXPIRY_SECONDS * 1000)
        };

        if (!user || !sessionData.token) {
            console.error('Debug: Email Signin resulted in NO SESSION or TOKEN.');
            console.error('AuthResponse Keys:', Object.keys(authResponse));
            return res.status(500).json({
                success: false,
                error: { code: 'AUTH_ERROR', message: 'Failed to get user session' },
            });
        }

        // 2. Return response
        return res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: (user as any).phone,
                    role: (user as any).role,
                },
                session: {
                    token: sessionData.token,
                    expiresAt: sessionData.expiresAt,
                },
            },
        });
    } catch (error: any) {
        console.error('Email signin error:', error);

        // Handle better-auth errors
        const message = error.body?.message || error.message || 'Failed to sign in';
        const code = error.body?.code || 'AUTH_ERROR';

        let status = error.status;
        if (status === 'UNPROCESSABLE_ENTITY') status = 422;
        if (typeof status !== 'number') status = 401;

        return res.status(status).json({
            success: false,
            error: { code, message },
        });
    }
});

export default router;
