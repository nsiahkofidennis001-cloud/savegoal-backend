export const CONSTANTS = {
    // OTP
    OTP_LENGTH: 6,
    OTP_EXPIRY_SECONDS: 300, // 5 minutes

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
    RATE_LIMIT_MAX_REQUESTS: 100,

    // Session
    SESSION_EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 7 days

    // Phone Validation (Ghana)
    GHANA_PHONE_REGEX: /^\+233[0-9]{9}$/,

    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
} as const;
