import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '../config/env.config.js';
import { standardLimiter, authLimiter } from './middlewares/rateLimit.middleware.js';
import { ApiException } from '../shared/exceptions/api.exception.js';
import { error } from '../shared/utils/response.util.js';

// Routes
import healthRoutes from './routes/v1/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import phoneOtpRoutes from '../modules/auth/phone/phone-otp.routes.js';
import walletRoutes from '../modules/wallet/wallet.routes.js';
import goalsRoutes from '../modules/goals/goals.routes.js';
import paymentRoutes from '../modules/payments/payment.routes.js';

const app = express();

// ==================== MIDDLEWARE ====================

// Security headers
app.use(helmet());

// CORS
app.use(
    cors({
        origin: env.NODE_ENV === 'production' ? ['https://savegoal.com'] : '*',
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

// Health checks
app.use('/health', healthRoutes);

// Phone OTP routes (Must be before generic auth catch-all)
app.use('/api/auth/phone', phoneOtpRoutes);

// Auth routes (better-auth)
app.use(authRoutes);

// Wallet routes
app.use('/api/wallet', walletRoutes);

// Goal routes
app.use('/api/goals', goalsRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

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

app.listen(PORT, () => {
    console.info(`🚀 SaveGoal API running on port ${PORT}`);
    console.info(`📍 Environment: ${env.NODE_ENV}`);
    console.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
