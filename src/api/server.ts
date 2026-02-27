import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env.config.js';
import { swaggerSpec } from '../config/swagger.config.js';
import { standardLimiter, authLimiter } from './middlewares/rateLimit.middleware.js';
import { ApiException } from '../shared/exceptions/api.exception.js';
import { error } from '../shared/utils/response.util.js';

// Routes
import healthRoutes from './routes/v1/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import phoneOtpRoutes from '../modules/auth/phone/phone-otp.routes.js';
import emailAuthRoutes from '../modules/auth/email/email-auth.routes.js';
import walletRoutes from '../modules/wallet/wallet.routes.js';
import goalsRoutes from '../modules/goals/goals.routes.js';
import publicGoalsRoutes from '../modules/goals/public-goals.routes.js';
import paymentRoutes from '../modules/payments/payment.routes.js';
import merchantsRoutes from '../modules/merchants/merchants.routes.js';
import productRoutes from '../modules/products/products.routes.js';
import automationRoutes from '../modules/automation/automation.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import adminDashboardRoutes from '../modules/admin/dashboard/index.js';
import kycRoutes from '../modules/kyc/kyc.routes.js';
import payoutRoutes from '../modules/wallet/payout.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';

const app = express();

// Trust proxy (required for Render/Cloudflare rate limiting)
app.set('trust proxy', 1);

// ==================== MIDDLEWARE ====================

// Security headers (relaxed CSP for Swagger UI)
app.use(
    helmet({
        contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    })
);

// CORS
app.use(
    cors({
        origin: env.NODE_ENV === 'production'
            ? [
                'https://savegoal.com',
                'https://save-goal-frontend.vercel.app',
                'https://savegoal-backend-2.onrender.com' // Allow Swagger UI
            ]
            : '*',
        credentials: true,
    })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', standardLimiter);

// ==================== ROUTES ====================

// Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'SaveGoal API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Root route
app.get('/', (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Welcome to SaveGoal API',
        version: '1.0.0',
        documentation: '/api-docs',
        status: 'healthy'
    });
});

// Health checks
app.use('/health', healthRoutes);

// EMERGENCY: Admin Password Force Set (Delete after use)
app.get('/emergency-fix-admin', async (req, res) => {
    const { email, pwd } = req.query;
    if (email !== 'nsiahkofidennis001@gmail.com') return res.status(403).json({ error: 'Auth failed' });

    try {
        const { prisma } = await import('../infra/prisma.client.js');
        const { auth } = await import('../modules/auth/auth.js');

        // 1. Ensure user exists
        const user = await prisma.user.findUnique({ where: { email: email as string } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // 2. Create a temporary user to get a valid hash for the requested password
        const tempEmail = `temp-${Date.now()}@example.com`;
        const tempUser = await auth.api.signUpEmail({
            body: { email: tempEmail, password: pwd as string, name: 'Temp' }
        });

        if (!tempUser || !tempUser.user) throw new Error('Failed to generate hash');

        // 3. Get the hash from temp user
        const tempAccount = await prisma.account.findFirst({
            where: { userId: tempUser.user.id }
        });
        const hash = tempAccount?.password;
        if (!hash) throw new Error('Hash not found');

        // 4. Upsert the account for our real admin
        await prisma.account.upsert({
            where: { id: (await prisma.account.findFirst({ where: { userId: user.id, providerId: 'credential' } }))?.id || 'none' },
            create: {
                userId: user.id,
                accountId: email as string,
                providerId: 'credential',
                password: hash,
            },
            update: {
                password: hash
            }
        });

        // 5. Clean up temp user
        await prisma.user.delete({ where: { id: tempUser.user.id } });

        return res.json({ success: true, message: `Password for ${email} has been forced to the requested value. Please log in now!` });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// Admin Dashboard (HTML UI)
app.use('/admin', adminDashboardRoutes);

// Phone OTP routes (Must be before generic auth catch-all)
app.use('/api/auth/phone', phoneOtpRoutes);

// Email Auth routes
app.use('/api/auth/email', emailAuthRoutes);

// Auth routes (better-auth)
app.use(authRoutes);

// Wallet routes
app.use('/api/wallet', walletRoutes);

// Goal routes
app.use('/api/goals', goalsRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Merchant routes
app.use('/api/merchants', merchantsRoutes);

// Product routes
app.use('/api/products', productRoutes);

// Automation routes
app.use('/api/automation', automationRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// KYC routes
app.use('/api/kyc', kycRoutes);

// Payout routes
app.use('/api/payouts', payoutRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((_req: Request, res: Response) => {
    return error(res, 'NOT_FOUND', 'Route not found', 404);
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);

    if (err instanceof ApiException) {
        return error(res, err.code, err.message, err.statusCode, err.details);
    }

    return error(
        res,
        'INTERNAL_ERROR',
        env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
        500
    );
});

// ==================== SERVER STARTUP ====================

const PORT = parseInt(env.PORT, 10);

async function startServer() {
    try {
        console.info('🔍 Running pre-flight checks...');

        // Check Database
        const { prisma } = await import('../infra/prisma.client.js');
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.info('✅ Database connection established');
        } catch (dbErr) {
            if (env.NODE_ENV === 'production') {
                console.error('❌ Database connection failed:', dbErr);
                throw dbErr;
            } else {
                console.warn('⚠️ Database unreachable (local network cannot reach Supabase).');
                console.warn('   Routes requiring DB will fail, but server will start for local dev.');
                console.warn('   Use a VPN or deploy to Render to test DB-dependent routes.');
            }
        }

        // Check Redis
        const { redis } = await import('../infra/redis.client.js');
        await redis.ping();
        console.info('✅ Redis connection established');

        app.listen(PORT, () => {
            console.info(`🚀 SaveGoal API running on port ${PORT}`);
            console.info(`📍 Environment: ${env.NODE_ENV}`);
            console.info(`🔗 BetterAuth URL: ${env.BETTER_AUTH_URL}`);
            console.info(`🔗 Health check: http://localhost:${PORT}/health`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export default app;
