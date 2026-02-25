import { betterAuth } from 'better-auth';
import { bearer, twoFactor } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../../infra/prisma.client.js';
import { CONSTANTS } from '../../config/constants.js';


export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),

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
    plugins: [
        bearer(),
        twoFactor({
            issuer: "SaveGoal SNBL",
        }),
    ],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
