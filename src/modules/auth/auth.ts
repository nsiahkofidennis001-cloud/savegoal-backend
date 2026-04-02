import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../../infra/prisma.client.js';
import { CONSTANTS } from '../../config/constants.js';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.config.js';

const defaultTrustedOrigins = env.NODE_ENV === 'production'
    ? [
        'https://savegoal.com',
        'https://save-goal-frontend.vercel.app',
        'https://savegoal-backend.onrender.com',
    ]
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
    ];

const configuredTrustedOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

const trustedOrigins = [...new Set([...defaultTrustedOrigins, ...configuredTrustedOrigins])];

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    trustedOrigins,

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
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
