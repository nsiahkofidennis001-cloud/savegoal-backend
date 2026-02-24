import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
    openapi: '3.0.0',
    info: {
        title: 'SaveGoal API',
        version: '1.0.0',
        description: 'SaveGoal SNBL (Save Now, Buy Later) Platform API',
    },
    servers: [
        {

            url: 'https://savegoal-backend-2.onrender.com',
            description: 'Production (Render)',
        },
        {
            url: 'http://localhost:3000',
            description: 'Local Development',
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                description: 'Session token from verify-otp response (session.token)',
            },
        },
        schemas: {
            SuccessResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object' },
                    timestamp: { type: 'string' },
                },
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            code: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
    paths: {
        // ==================== HEALTH ====================
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Basic health check',
                responses: {
                    '200': {
                        description: 'Server is running',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                status: { type: 'string', example: 'ok' },
                                                uptime: { type: 'number', example: 42.5 },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/health/db': {
            get: {
                tags: ['Health'],
                summary: 'Database connectivity check',
                responses: {
                    '200': { description: 'Database connected' },
                    '503': { description: 'Database unreachable' },
                },
            },
        },
        '/health/redis': {
            get: {
                tags: ['Health'],
                summary: 'Redis connectivity check',
                responses: {
                    '200': { description: 'Redis connected' },
                    '503': { description: 'Redis unreachable' },
                },
            },
        },

        // ==================== AUTH - EMAIL ====================
        '/api/auth/email/signup': {
            post: {
                tags: ['Auth - Email'],
                summary: 'Register with email and password',
                description: 'Creates a new user account and wallet. Returns session token.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password', 'name'],
                                properties: {
                                    email: {
                                        type: 'string',
                                        format: 'email',
                                        example: 'user@example.com',
                                    },
                                    password: {
                                        type: 'string',
                                        format: 'password',
                                        example: 'Password123!',
                                        minLength: 8,
                                    },
                                    name: {
                                        type: 'string',
                                        example: 'John Doe',
                                    },
                                    phone: {
                                        type: 'string',
                                        example: '+233546351309',
                                        description: 'Optional phone number',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'User registered successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                user: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string' },
                                                        email: { type: 'string' },
                                                        name: { type: 'string' },
                                                        role: { type: 'string' },
                                                    },
                                                },
                                                session: {
                                                    type: 'object',
                                                    properties: {
                                                        token: { type: 'string' },
                                                        expiresAt: { type: 'string' },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '400': { description: 'Validation error' },
                    '422': { description: 'User already exists' },
                },
            },
        },
        '/api/auth/email/signin': {
            post: {
                tags: ['Auth - Email'],
                summary: 'Login with email and password',
                description: 'Authenticates user and returns session token.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: {
                                        type: 'string',
                                        format: 'email',
                                        example: 'user@example.com',
                                    },
                                    password: {
                                        type: 'string',
                                        format: 'password',
                                        example: 'Password123!',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Login successful',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                user: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string' },
                                                        email: { type: 'string' },
                                                        name: { type: 'string' },
                                                        role: { type: 'string' },
                                                    },
                                                },
                                                session: {
                                                    type: 'object',
                                                    properties: {
                                                        token: { type: 'string' },
                                                        expiresAt: { type: 'string' },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '401': { description: 'Invalid email or password' },
                },
            },
        },

        // ==================== AUTH - PHONE OTP ====================
        '/api/auth/phone/send-otp': {
            post: {
                tags: ['Auth - Phone OTP'],
                summary: 'Send OTP to a Ghana phone number',
                description: 'In dev mode (no Twilio), OTP is returned in the response as `devOtp`.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['phone'],
                                properties: {
                                    phone: {
                                        type: 'string',
                                        example: '+233546351309',
                                        description: 'Ghana phone number in +233XXXXXXXXX format',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'OTP sent successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                message: { type: 'string' },
                                                devOtp: {
                                                    type: 'string',
                                                    example: '123456',
                                                    description: 'Only returned in dev mode (no Twilio)',
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '400': { description: 'Validation error (invalid phone format)' },
                    '429': { description: 'Rate limited (max 3 OTPs/hour)' },
                },
            },
        },
        '/api/auth/phone/verify-otp': {
            post: {
                tags: ['Auth - Phone OTP'],
                summary: 'Verify OTP and login/register',
                description: 'Verifies the OTP. For testing, use the magic code **`123456`** if a real SMS is not delivered.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['phone', 'otp'],
                                properties: {
                                    phone: {
                                        type: 'string',
                                        example: '+233546351309',
                                    },
                                    otp: {
                                        type: 'string',
                                        example: '123456',
                                        description: 'The OTP from send-otp (use devOtp value in dev mode)',
                                    },
                                    name: {
                                        type: 'string',
                                        example: 'John Doe',
                                        description: 'Optional. Used when creating a new user.',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'OTP verified, session created',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                user: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string' },
                                                        phone: { type: 'string' },
                                                        name: { type: 'string' },
                                                        role: { type: 'string' },
                                                    },
                                                },
                                                session: {
                                                    type: 'object',
                                                    properties: {
                                                        token: { type: 'string' },
                                                        expiresAt: { type: 'string' },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '400': { description: 'Invalid or expired OTP' },
                },
            },
        },

        // ==================== WALLET ====================
        '/api/wallet': {
            get: {
                tags: ['Wallet'],
                summary: 'Get user wallet balance',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Wallet details',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                userId: { type: 'string' },
                                                balance: { type: 'number', example: 150.0 },
                                                currency: { type: 'string', example: 'GHS' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '401': { description: 'Unauthorized - No valid session token' },
                },
            },
        },
        '/api/wallet/deposit': {
            post: {
                tags: ['Wallet'],
                summary: 'Mock deposit into wallet (testing only)',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['amount'],
                                properties: {
                                    amount: {
                                        type: 'number',
                                        example: 50.0,
                                        description: 'Amount in GHS to deposit',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Deposit successful' },
                    '400': { description: 'Invalid amount' },
                    '401': { description: 'Unauthorized' },
                },
            },
        },

        // ==================== GOALS ====================
        '/api/goals': {
            get: {
                tags: ['Goals'],
                summary: 'List all user goals',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'List of goals' },
                    '401': { description: 'Unauthorized' },
                },
            },
            post: {
                tags: ['Goals'],
                summary: 'Create a new savings goal',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'targetAmount'],
                                properties: {
                                    name: {
                                        type: 'string',
                                        example: 'New Phone',
                                        description: 'Goal name',
                                    },
                                    targetAmount: {
                                        type: 'number',
                                        example: 2000,
                                        description: 'Target savings amount in GHS',
                                    },
                                    deadline: {
                                        type: 'string',
                                        format: 'date-time',
                                        example: '2026-06-01T00:00:00Z',
                                        description: 'Optional deadline',
                                    },
                                    description: {
                                        type: 'string',
                                        example: 'Saving for a new smartphone',
                                        description: 'Optional description',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Goal created' },
                    '400': { description: 'Validation error' },
                    '401': { description: 'Unauthorized' },
                },
            },
        },
        '/api/goals/{id}': {
            get: {
                tags: ['Goals'],
                summary: 'Get a specific goal',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Goal ID',
                    },
                ],
                responses: {
                    '200': { description: 'Goal details' },
                    '401': { description: 'Unauthorized' },
                    '404': { description: 'Goal not found' },
                },
            },
        },
        '/api/goals/{id}/fund': {
            post: {
                tags: ['Goals'],
                summary: 'Fund a goal from wallet balance',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Goal ID',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['amount'],
                                properties: {
                                    amount: {
                                        type: 'number',
                                        example: 100,
                                        description: 'Amount to transfer from wallet to goal',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Goal funded successfully' },
                    '400': { description: 'Invalid amount or insufficient balance' },
                    '401': { description: 'Unauthorized' },
                    '404': { description: 'Goal not found' },
                },
            },
        },

        // ==================== PAYMENTS ====================
        '/api/payments/deposit': {
            post: {
                tags: ['Payments'],
                summary: 'Initialize a Paystack deposit',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['amount'],
                                properties: {
                                    amount: {
                                        type: 'number',
                                        example: 100,
                                        description: 'Amount in GHS to deposit via Paystack',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Paystack payment URL returned' },
                    '400': { description: 'Invalid amount' },
                    '401': { description: 'Unauthorized' },
                },
            },
        },
        '/api/payments/webhook': {
            post: {
                tags: ['Payments'],
                summary: 'Paystack webhook handler',
                description: 'Called by Paystack when payment events occur. Verifies signature before processing.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { type: 'object' },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Event received' },
                    '401': { description: 'Invalid signature' },
                },
            },
        },

        // ==================== KYC ====================
        '/api/kyc/submit': {
            post: {
                tags: ['KYC'],
                summary: 'Submit KYC and Bank details',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['idType', 'idNumber'],
                                properties: {
                                    idType: { type: 'string', example: 'GHANA_CARD' },
                                    idNumber: { type: 'string', example: 'GHA-123456789-0' },
                                    idImageUrl: { type: 'string', example: 'https://example.com/id.jpg' },
                                    bankName: { type: 'string', example: 'GCB Bank' },
                                    bankAccountNo: { type: 'string', example: '1234567890123' },
                                    bankAccountName: { type: 'string', example: 'John Doe' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'KYC submitted successfully' },
                    '401': { description: 'Unauthorized' },
                },
            },
        },
        '/api/kyc/status': {
            get: {
                tags: ['KYC'],
                summary: 'Get current user KYC status',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'Current KYC status and bank details' },
                    '401': { description: 'Unauthorized' },
                },
            },
        },

        // ==================== MERCHANTS ====================
        '/api/merchants/onboard': {
            post: {
                tags: ['Merchants'],
                summary: 'Onboard as a merchant',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['businessName', 'contactEmail', 'contactPhone', 'businessAddress'],
                                properties: {
                                    businessName: { type: 'string', example: 'Tech Store' },
                                    contactEmail: { type: 'string', example: 'biz@techstore.com' },
                                    contactPhone: { type: 'string', example: '+233200000000' },
                                    businessAddress: { type: 'string', example: 'Accra Mall' },
                                    registrationNo: { type: 'string', example: 'BN12345' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Merchant profile created' },
                },
            },
        },
        '/api/merchants/profile': {
            get: {
                tags: ['Merchants'],
                summary: 'Get merchant profile',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'Merchant profile data' },
                    '401': { description: 'Unauthorized' },
                    '404': { description: 'Merchant not found' },
                },
            },
            patch: {
                tags: ['Merchants'],
                summary: 'Update merchant profile',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    businessName: { type: 'string' },
                                    businessAddress: { type: 'string' },
                                    contactEmail: { type: 'string' },
                                    contactPhone: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Profile updated' },
                    '401': { description: 'Unauthorized' },
                },
            },
        },

        // ==================== PRODUCTS ====================
        '/api/products': {
            get: {
                tags: ['Products'],
                summary: 'List all products in SNBL program',
                responses: {
                    '200': { description: 'List of available products' },
                },
            },
            post: {
                tags: ['Products'],
                summary: 'Add a new product (Merchant only)',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'description', 'price', 'category'],
                                properties: {
                                    name: { type: 'string', example: 'iPhone 15' },
                                    description: { type: 'string', example: 'Latest Apple iPhone' },
                                    price: { type: 'number', example: 12000.00 },
                                    category: { type: 'string', example: 'Electronics' },
                                    imageUrl: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Product added' },
                },
            },
        },

        // ==================== AUTOMATION ====================
        '/api/automation/process-monthly': {
            post: {
                tags: ['Automation'],
                summary: 'Trigger monthly savings batch (Admin only)',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'Batch process completed' },
                    '403': { description: 'Forbidden - Admins only' },
                },
            },
        },

        // ==================== ADMIN ====================
        '/api/admin/stats': {
            get: {
                tags: ['Admin'],
                summary: 'Get system-wide statistics',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'Aggregated stats' },
                },
            },
        },
        '/api/admin/kyc/pending': {
            get: {
                tags: ['Admin'],
                summary: 'List pending KYC applications',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'List of users awaiting verification' },
                },
            },
        },
        '/api/admin/kyc/{userId}/verify': {
            patch: {
                tags: ['Admin'],
                summary: 'Approve or Decline KYC',
                security: [{ BearerAuth: [] }],
                parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['VERIFIED', 'FAILED'] },
                                    note: { type: 'string', description: 'Rejection reason' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'KYC status updated' },
                },
            },
        },
        '/api/admin/payouts/pending': {
            get: {
                tags: ['Admin'],
                summary: 'List pending merchant payouts',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'Pending payout transactions' },
                },
            },
        },

        // ==================== PAYOUTS ====================
        '/api/payouts/request': {
            post: {
                tags: ['Payouts'],
                summary: 'Request a merchant payout',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['amount'],
                                properties: {
                                    amount: { type: 'number', example: 500.00 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Payout request submitted' },
                    '403': { description: 'Forbidden - Merchants only' },
                },
            },
        },

        // ==================== NOTIFICATIONS ====================
        '/api/notifications': {
            get: {
                tags: ['Notifications'],
                summary: 'List user notifications',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                ],
                responses: {
                    '200': { description: 'List of notifications and unread count' },
                    '401': { description: 'Unauthorized' },
                },
            },
        },
        '/api/notifications/{id}/read': {
            patch: {
                tags: ['Notifications'],
                summary: 'Mark notification as read',
                security: [{ BearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'Marked as read' },
                    '401': { description: 'Unauthorized' },
                },
            },
        },
        '/api/notifications/read-all': {
            post: {
                tags: ['Notifications'],
                summary: 'Mark all notifications as read',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': { description: 'All marked as read' },
                    '401': { description: 'Unauthorized' },
                },
            },
        },
    },
};

const options: swaggerJsdoc.Options = {
    swaggerDefinition,
    apis: ['./src/modules/**/*.routes.ts', './src/api/routes/**/*.routes.ts'], // Scan for JSDoc comments
};

export const swaggerSpec = swaggerJsdoc(options);
