import { prisma } from '../../infra/prisma.client.js';
import { env } from '../../config/env.config.js';
import { logger } from '../../infra/logger.js';
import Twilio from 'twilio';
import { NotificationCategory } from '@prisma/client';

// Initialize Twilio client
const twilioClient =
    env.TWILIO_ACCOUNT_SID?.startsWith('AC') && env.TWILIO_AUTH_TOKEN
        ? Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
        : null;

export interface NotificationPayload {
    userId: string;
    title: string;
    message: string;
    category?: NotificationCategory;
    channels: ('IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL')[];
    metadata?: Record<string, unknown>;
    emailHtml?: string; // Optional custom HTML for email
}

export class NotificationService {
    /**
     * Send a notification through multiple channels
     */
    static async send(payload: NotificationPayload) {
        const { userId, title, message, category = 'SYSTEM', channels, metadata, emailHtml } = payload;
        const results: Record<string, unknown> = {};

        // 1. In-app Notification (Database)
        if (channels.includes('IN_APP')) {
            try {
                results.inApp = await prisma.notification.create({
                    data: {
                        userId,
                        title,
                        message,
                        category,
                        metadata: metadata as any
                    }
                });
            } catch (err: unknown) {
                const error = err as Error;
                logger.error(error, 'In-app notification failed:');
                results.inAppError = error.message;
            }
        }

        // Fetch user for phone/email if needed
        let user: { phone: string | null; email: string | null; name: string | null } | null = null;
        if (channels.some(c => ['SMS', 'WHATSAPP', 'EMAIL'].includes(c))) {
            user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, email: true, name: true } });
        }

        // 2. SMS (Twilio)
        if (channels.includes('SMS') && user?.phone) {
            try {
                if (twilioClient && env.TWILIO_PHONE_NUMBER) {
                    results.sms = await twilioClient.messages.create({
                        body: `${title}\n${message}`,
                        from: env.TWILIO_PHONE_NUMBER,
                        to: user.phone
                    });
                } else {
                    logger.info(`[DEV SMS] to ${user.phone}: ${title} - ${message}`);
                    results.sms = 'DEV_MODE_MOCK';
                }
            } catch (err: unknown) {
                const error = err as Error;
                logger.error(error, 'SMS notification failed:');
                results.smsError = error.message;
            }
        }

        // 3. WhatsApp (Twilio)
        if (channels.includes('WHATSAPP') && user?.phone) {
            try {
                if (twilioClient && env.TWILIO_PHONE_NUMBER) {
                    // WhatsApp numbers in Twilio must be prefixed with 'whatsapp:'
                    results.whatsapp = await twilioClient.messages.create({
                        body: `*${title}*\n${message}`,
                        from: `whatsapp:${env.TWILIO_PHONE_NUMBER}`,
                        to: `whatsapp:${user.phone}`
                    });
                } else {
                    logger.info(`[DEV WhatsApp] to ${user.phone}: ${title} - ${message}`);
                    results.whatsapp = 'DEV_MODE_MOCK';
                }
            } catch (err: unknown) {
                const error = err as Error;
                logger.error(error, 'WhatsApp notification failed:');
                results.whatsappError = error.message;
            }
        }

        // 4. Email (Resend)
        if (channels.includes('EMAIL') && user?.email) {
            try {
                const { EmailClient } = await import('../../infra/email.client.js');
                results.email = await EmailClient.send({
                    to: user.email,
                    subject: title,
                    html: emailHtml || `<p>Hi ${user.name || 'there'},</p><p>${message}</p>`,
                });
            } catch (err: unknown) {
                const error = err as Error;
                logger.error(error, 'Email notification failed:');
                results.emailError = error.message;
            }
        }

        return results;
    }

    /**
     * Get unread notification count for a user
     */
    static async getUnreadCount(userId: string) {
        return prisma.notification.count({
            where: { userId, isRead: false }
        });
    }

    /**
     * List user notifications
     */
    static async list(userId: string, limit = 20, offset = 0) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId: string, userId: string) {
        return prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true }
        });
    }

    /**
     * Mark all user notifications as read
     */
    static async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
    }
}
