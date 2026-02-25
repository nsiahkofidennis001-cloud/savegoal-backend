import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../../infra/prisma.client.js';
import { CONSTANTS } from '../../config/constants.js';
import { randomUUID } from 'node:crypto';

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        async sendVerificationEmail({ user, url }: { user: any; url: string }) {
            const { EmailClient } = await import('../../infra/email.client.js');
            await EmailClient.send({
                to: user.email,
                subject: 'Verify your SaveGoal email',
                html: `<p>Hi ${user.name},</p><p>Please verify your email by clicking <a href="${url}">here</a>.</p>`,
            });
        },
        async sendPasswordResetEmail({ user, url }: { user: any; url: string }) {
            const { EmailClient } = await import('../../infra/email.client.js');
            await EmailClient.send({
                to: user.email,
                subject: 'Reset your SaveGoal password',
                html: `<p>Hi ${user.name},</p><p>You can reset your password by clicking <a href="${url}">here</a>.</p>`,
            });
        },
    },

    session: {
        expiresIn: CONSTANTS.SESSION_EXPIRY_SECONDS,
        updateAge: 24 * 60 * 60, // Update session every 24 hours
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes
        },
    },

    user: {
        additionalFields: {
            phone: {
                type: 'string',
                required: false,
                unique: true,
                input: true,
            },
            role: {
                type: 'string',
                defaultValue: 'CONSUMER',
                input: false,
            },
        },
    },

    advanced: {
        // generateId removed as it is not a valid option
    },
    plugins: [bearer()],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
