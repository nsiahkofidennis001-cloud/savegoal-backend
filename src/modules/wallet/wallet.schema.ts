import { z } from 'zod';

export const depositSchema = z.object({
    body: z.object({
        amount: z.number().positive('Deposit amount must be a positive number'),
    }),
});
