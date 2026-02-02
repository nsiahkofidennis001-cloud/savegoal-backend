import { env } from '../../../config/env.config.js';
import { ApiException } from '../../../shared/exceptions/api.exception.js';

export interface PaystackInitializeResponse {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}

export interface PaystackVerifyResponse {
    status: boolean;
    message: string;
    data: {
        id: number;
        status: string;
        reference: string;
        amount: number;
        gateway_response: string;
        paid_at: string;
        created_at: string;
        channel: string;
        currency: string;
        customer: {
            email: string;
        };
        metadata: any;
    };
}

export class PaystackProvider {
    private static readonly BASE_URL = 'https://api.paystack.co';

    private static get headers() {
        return {
            Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        };
    }

    private static isMock() {
        return env.NODE_ENV === 'development' &&
            (env.PAYSTACK_SECRET_KEY === 'your-paystack-secret-key' || !env.PAYSTACK_SECRET_KEY);
    }

    /**
     * Initialize a transaction
     */
    static async initializeTransaction(data: {
        email: string;
        amount: number; // In GHS (will be converted to pesewas)
        reference?: string;
        callback_url?: string;
        metadata?: any;
    }): Promise<PaystackInitializeResponse> {
        if (this.isMock()) {
            console.info('🛠️ Using Mock Paystack Initialization');
            return {
                status: true,
                message: 'Mock initialization successful',
                data: {
                    authorization_url: 'https://checkout.paystack.com/mock-transaction',
                    access_code: 'mock-access-code',
                    reference: data.reference || `MOCK-${Date.now()}`,
                }
            };
        }

        try {
            const response = await fetch(`${this.BASE_URL}/transaction/initialize`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    ...data,
                    amount: Math.round(data.amount * 100), // Paystack expects amount in Kobo/Pesewas
                    currency: 'GHS',
                }),
            });

            const result = await response.json() as PaystackInitializeResponse;

            if (!response.ok) {
                throw new Error(result.message || 'Failed to initialize Paystack transaction');
            }

            return result;
        } catch (error: any) {
            console.error('Paystack Initialize Error:', error.message);
            throw new ApiException(
                500,
                'PAYMENT_ERROR',
                error.message || 'Failed to initialize Paystack transaction'
            );
        }
    }

    /**
     * Verify a transaction
     */
    static async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
        if (this.isMock() || reference.startsWith('MOCK-')) {
            console.info('🛠️ Using Mock Paystack Verification');
            return {
                status: true,
                message: 'Mock verification successful',
                data: {
                    id: 12345,
                    status: 'success',
                    reference,
                    amount: 1000,
                    gateway_response: 'Successful',
                    paid_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    channel: 'card',
                    currency: 'GHS',
                    customer: { email: 'mock@example.com' },
                    metadata: {},
                }
            };
        }

        try {
            const response = await fetch(`${this.BASE_URL}/transaction/verify/${reference}`, {
                method: 'GET',
                headers: this.headers,
            });

            const result = await response.json() as PaystackVerifyResponse;

            if (!response.ok) {
                throw new Error(result.message || 'Failed to verify Paystack transaction');
            }

            return result;
        } catch (error: any) {
            console.error('Paystack Verify Error:', error.message);
            throw new ApiException(
                500,
                'PAYMENT_ERROR',
                error.message || 'Failed to verify Paystack transaction'
            );
        }
    }
}
