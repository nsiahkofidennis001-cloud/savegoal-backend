import { z } from 'zod';

const envSchema = z.object({
    // Server
    PORT: z.string().default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),

    // Redis
    REDIS_URL: z.string().url(),

    // better-auth
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),

    // Twilio
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
    PAYSTACK_SECRET_KEY: z.string().optional(),

    // Security
    ENCRYPTION_KEY: z.string().min(32),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const flattenedErrors = parsed.error.flatten().fieldErrors;
    console.error('❌ Invalid environment variables:', JSON.stringify(flattenedErrors, null, 2));

    // Log helpful message for Render users
    const missingKeys = Object.keys(flattenedErrors);
    console.error(`Missing or invalid environment variables: ${missingKeys.join(', ')}`);

    throw new Error(`Invalid environment variables: ${missingKeys.join(', ')}`);
}

export const env = parsed.data;
