import sgMail from '@sendgrid/mail';
import { env } from '../config/env.config.js';

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
                console.info('✉️ [DEV EMAIL (SENDGRID MOCK)]');
                console.info(`   From:    ${from}`);
                console.info(`   To:      ${to}`);
                console.info(`   Subject: ${subject}`);
                console.info('   Body Snippet:', html.substring(0, 100) + '...');
                return { id: 'dev-mode-mock-id' };
            }
        } catch (err: any) {
            console.error('❌ Failed to send email via SendGrid:', err.response?.body || err.message);
            // We usually don't want to crash the whole request if an email fails, 
            // but we should at least log it.
            return null;
        }
    }
}
