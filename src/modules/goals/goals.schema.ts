import { z } from 'zod';

export const createGoalSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').max(100),
        description: z.string().max(500).optional(),
        targetAmount: z.number().positive('Target amount must be a positive number'),
        deadline: z.string().datetime().optional(),
    }),
});

export const fundGoalSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid goal ID'),
    }),
    body: z.object({
        amount: z.number().positive('Amount must be a positive number'),
    }),
});
