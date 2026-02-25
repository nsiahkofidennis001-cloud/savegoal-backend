import sgMail from '@sendgrid/mail';
import { env } from '../config/env.config.js';
import { logger } from './logger.js';

/**
 * Initialize SendGrid client if API key is provided and not a placeholder
 */
const apiKey = env.SENDGRID_API_KEY;
const isPlaceholder = !apiKey || apiKey.includes('YOUR_SENDGRID_API_KEY');

if (apiKey && !isPlaceholder) {
    sgMail.setApiKey(apiKey);
}

const sendgridReady = !!apiKey && !isPlaceholder;

export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
}

export class EmailClient {
    /**
     * Send an email using SendGrid API
     */
    static async send(options: SendEmailOptions) {
        const { to, subject, html, text, from = env.EMAIL_FROM } = options;

        try {
            if (sendgridReady) {
                const msg = {
                    to,
                    from,
                    subject,
                    text: text || html.replace(/<[^>]*>?/gm, ''),
                    html,
                };

                const [response] = await sgMail.send(msg);

                // SendGrid returns a response object on success
                return { id: response.headers['x-message-id'] || 'sg-success' };
            } else {
                // Development Mode - Log to console
                logger.info('✉️ [DEV EMAIL (SENDGRID MOCK)]');
                logger.info(`   From:    ${from}`);
                logger.info(`   To:      ${to}`);
                logger.info(`   Subject: ${subject}`);
                logger.info({ snippet: html.substring(0, 100) + '...' }, '   Body Snippet:');
                return { id: 'dev-mode-mock-id' };
            }
        } catch (err: unknown) {
            const error = err as any;
            logger.error(error, '❌ Failed to send email via SendGrid:');
            // We usually don't want to crash the whole request if an email fails, 
            // but we should at least log it.
            return null;
        }
    }
}
