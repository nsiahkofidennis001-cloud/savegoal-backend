import { Response } from 'express';

interface SuccessResponse<T> {
    success: true;
    data: T;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
    timestamp: string;
}

interface ErrorResponse {
    success: false;
    data: null;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
    timestamp: string;
}

/**
 * Send a successful JSON response
 */
export function success<T>(res: Response, data: T, meta?: SuccessResponse<T>['meta'], status = 200) {
    const response: SuccessResponse<T> = {
        success: true,
        data,
        meta,
        timestamp: new Date().toISOString(),
    };
    return res.status(status).json(response);
}

/**
 * Send an error JSON response
 */
export function error(
    res: Response,
    code: string,
    message: string,
    status = 500,
    details?: unknown
) {
    const response: ErrorResponse = {
        success: false,
        data: null,
        error: { code, message, details },
        timestamp: new Date().toISOString(),
    };
    return res.status(status).json(response);
}
