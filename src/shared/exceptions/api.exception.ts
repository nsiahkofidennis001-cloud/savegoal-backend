export class ApiException extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: unknown;

    constructor(statusCode: number, code: string, message: string, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'ApiException';

        // Maintains proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
        return new ApiException(400, code, message, details);
    }

    static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
        return new ApiException(401, code, message);
    }

    static forbidden(message = 'Access denied', code = 'FORBIDDEN') {
        return new ApiException(403, code, message);
    }

    static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
        return new ApiException(404, code, message);
    }

    static conflict(message: string, code = 'CONFLICT') {
        return new ApiException(409, code, message);
    }

    static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED') {
        return new ApiException(429, code, message);
    }

    static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
        return new ApiException(500, code, message);
    }
}
