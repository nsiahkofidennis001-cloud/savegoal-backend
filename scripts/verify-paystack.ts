import 'dotenv/config';
import { PaystackProvider } from '../src/modules/payments/providers/paystack.provider.js';

async function verifyPaystack() {
    console.log('--- Paystack Integration Test ---');

    const testData = {
        email: 'test@example.com',
        amount: 10, // 10 GHS
        metadata: { custom_fields: [{ display_name: 'Test', variable_name: 'test', value: 'verification' }] }
    };

    try {
        console.log('Attempting to initialize a test transaction...');
        const result = await PaystackProvider.initializeTransaction(testData);

        if (result.status) {
            console.log('✅ Paystack Connection Successful!');
            console.log('Message:', result.message);
            console.log('Payment URL:', result.data.authorization_url);
            console.log('Reference:', result.data.reference);
        } else {
            console.error('❌ Paystack Initialization Failed:', result.message);
        }
    } catch (err: any) {
        console.error('❌ Paystack Error:');
        console.error('Message:', err.message);
        console.error('Status Code:', err.statusCode);
    }
}

verifyPaystack().catch(console.error);
