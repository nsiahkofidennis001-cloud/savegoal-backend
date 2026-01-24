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
        if (!env.PAYSTACK_SECRET_KEY) {
            throw new ApiException(500, 'INTERNAL_ERROR', 'Paystack Secret Key is not configured');
        }

        return {
            Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        };
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
