import sgMail from '@sendgrid/mail';
import { env } from '../../config/env.config.js';

export interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

// Initialize SendGrid
if (env.SENDGRID_API_KEY) {
    sgMail.setApiKey(env.SENDGRID_API_KEY);
}

export class EmailService {
    /**
     * Send a professional email
     */
    static async send(options: EmailOptions) {
        const { to, subject, text, html } = options;
        const fromEmail = env.FROM_EMAIL || 'noreply@savegoal.com';

        if (!env.SENDGRID_API_KEY) {
            console.warn(`[DEV EMAIL] to ${to}: Subject: ${subject}`);
            console.warn(`Body: ${text}`);
            return { mock: true, sent: true };
        }

        try {
            const msg = {
                to,
                from: fromEmail,
                subject,
                text,
                html: html || text.replace(/\n/g, '<br>'),
            };

            const response = await sgMail.send(msg);
            return response;
        } catch (error: any) {
            console.error('[EMAIL ERROR] Failed to send email via SendGrid:', {
                message: error.message,
                code: error.code,
                response: error.response?.body
            });
            throw error;
        }
    }
}
