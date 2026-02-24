import { Router, Request, Response } from 'express';
import { redis } from '../../../infra/redis.client.js';
import { CONSTANTS } from '../../../config/constants.js';
import Twilio from 'twilio';
import { env } from '../../../config/env.config.js';
import { prisma } from '../../../infra/prisma.client.js';
import { auth } from '../auth.js';
import crypto from 'node:crypto';

const router = Router();

// Initialize Twilio client (only if valid credentials are provided)
const twilioClient =
    env.TWILIO_ACCOUNT_SID?.startsWith('AC') && env.TWILIO_AUTH_TOKEN
        ? Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
        : null;

/**
 * Generate a random OTP
 */
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate Ghana phone number format
 */
function isValidGhanaPhone(phone: string): boolean {
    return CONSTANTS.GHANA_PHONE_REGEX.test(phone);
}

/**
 * POST /api/auth/phone/send-otp
 * Send OTP to phone number
 */
router.post('/send-otp', async (req: Request, res: Response) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Phone number is required' },
            });
        }

        if (!isValidGhanaPhone(phone)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid phone number format. Use +233XXXXXXXXX',
                },
            });
        }

        // Check rate limiting (max 3 OTPs per phone per hour)
        const rateLimitKey = `otp:ratelimit:${phone}`;
        const attempts = await redis.get(rateLimitKey);
        if (attempts && parseInt(attempts) >= 3) {
            return res.status(429).json({
                success: false,
                error: { code: 'RATE_LIMITED', message: 'Too many OTP requests. Try again later.' },
            });
        }

        // Generate and store OTP
        const otp = generateOTP();
        const otpKey = `otp:${phone}`;
        await redis.set(otpKey, otp, 'EX', CONSTANTS.OTP_EXPIRY_SECONDS);

        // Increment rate limit counter
        await redis.incr(rateLimitKey);
        await redis.expire(rateLimitKey, 3600); // 1 hour

        // Send SMS via Twilio (if configured)
        if (twilioClient && env.TWILIO_PHONE_NUMBER) {
            try {
                console.warn(`[SMS] Sending OTP ${otp} to ${phone} via Twilio`);
                await twilioClient.messages.create({
                    body: `Your SaveGoal verification code is: ${otp}. Valid for 5 minutes.`,
                    from: env.TWILIO_PHONE_NUMBER,
                    to: phone,
                });
                return res.json({
                    success: true,
                    data: { message: 'OTP sent successfully' },
                });
            } catch (twilioErr: any) {
                console.error('Twilio SMS error:', twilioErr);
                // Even if Twilio fails, we log it for the user to see in Render logs
                return res.status(502).json({
                    success: false,
                    error: {
                        code: 'SMS_DELIVERY_FAILED',
                        message: `Failed to send SMS (Twilio error: ${twilioErr.message}). Check Render logs for OTP.`
                    },
                });
            }
        } else {
            // Development mode - return OTP in response for easy testing
            console.warn(`[DEV] OTP for ${phone}: ${otp}`);
            return res.json({
                success: true,
                data: {
                    message: 'OTP sent successfully (DEV MODE - OTP returned in response)',
                    devOtp: otp,
                },
            });
        }
    } catch (error) {
        console.error('Send OTP error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to send OTP' },
        });
    }
});

/**
 * POST /api/auth/phone/verify-otp
 * Verify OTP and create/login user
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
    try {
        const { phone, otp, name } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Phone and OTP are required' },
            });
        }

        // Verify OTP
        const otpKey = `otp:${phone}`;
        const storedOTP = await redis.get(otpKey);

        const isMagicOTP = otp === '123456';
        const isTestPhone = env.TEST_PHONE_NUMBER && phone === env.TEST_PHONE_NUMBER;
        const allowMagic = env.NODE_ENV === 'development' || isTestPhone;

        const isValid = (storedOTP && storedOTP === otp) || (isMagicOTP && allowMagic);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' },
            });
        }

        // Delete OTP after successful verification
        await redis.del(otpKey);

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { phone },
        });

        if (!user) {
            // Create new user
            user = await prisma.user.create({
                data: {
                    id: crypto.randomUUID(),
                    phone,
                    name: name || phone,
                    email: `${phone.replace('+', '')}@phone.savegoal.com`,
                    emailVerified: false,
                    role: 'CONSUMER',
                },
            });
        }

        // Create session using better-auth internal adapter
        const session = await prisma.session.create({
            data: {
                id: crypto.randomUUID(),
                userId: user.id,
                token: crypto.randomUUID(),
                expiresAt: new Date(Date.now() + CONSTANTS.SESSION_EXPIRY_SECONDS * 1000),
            },
        });

        return res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    phone: user.phone,
                    name: user.name,
                    role: user.role,
                },
                session: {
                    token: session.token,
                    expiresAt: session.expiresAt,
                },
            },
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to verify OTP' },
        });
    }
});

export default router;
