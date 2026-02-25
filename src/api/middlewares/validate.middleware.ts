import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, z } from 'zod';
import { error } from '../../shared/utils/response.util.js';

export function validate(schema: AnyZodObject) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // Replace request data with parsed/sanitized data (strips unknown keys if schema uses .strip())
            req.body = parsed.body;
            req.query = parsed.query as Request['query'];
            req.params = parsed.params as Request['params'];
            return next();
        } catch (err) {
            if (err instanceof z.ZodError) {
                // Return a structured validation error
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid request data',
                        details: err.flatten().fieldErrors,
                    },
                });
            }
            return error(res, 'INTERNAL_ERROR', 'Internal Validation Error', 500);
        }
    };
}
