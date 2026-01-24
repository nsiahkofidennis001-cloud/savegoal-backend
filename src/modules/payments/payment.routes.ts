import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentService } from './payment.service.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { env } from '../../config/env.config.js';

const router = Router();

/**
 * POST /api/payments/deposit
 * Initialize a deposit
 */
router.post('/deposit', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.body.user.id;
        const { amount } = req.body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return error(res, 'VALIDATION_ERROR', 'Valid positive amount is required', 400);
        }

        const result = await PaymentService.initializeDeposit(userId, amount);
        return success(res, result);
    } catch (err: any) {
        console.error('Initialize deposit error:', err);
        const code = err.code || 'INTERNAL_ERROR';
        const statusCode = err.statusCode || 500;
        return error(res, code, err.message, statusCode);
    }
});

/**
 * POST /api/payments/webhook
 * Paystack Webhook Handler
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        // 1. Verify Signature
        const signature = req.headers['x-paystack-signature'] as string;
        if (!signature) {
            return res.status(401).send('No signature');
        }

        const hash = crypto
            .createHmac('sha512', env.PAYSTACK_SECRET_KEY || '')
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (hash !== signature) {
            console.warn('⚠️ Invalid Paystack Webhook Signature');
            return res.status(401).send('Invalid signature');
        }

        // 2. Acknowledge Receipt Immediately
        res.status(200).send('Event received');

        // 3. Process Event
        const event = req.body;
        console.info(`🔔 Paystack Webhook received: ${event.event}`);

        if (event.event === 'charge.success') {
            const { reference } = event.data;
            await PaymentService.fulfillPayment(reference);
        }
    } catch (err: any) {
        console.error('Webhook error:', err);
        // We already sent 200, so we just log the processing error
    }
});

export default router;
