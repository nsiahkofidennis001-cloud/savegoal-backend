import 'dotenv/config';
import Twilio from 'twilio';
import { env } from '../src/config/env.config.js';

const targetPhone = '+233546351309';
const sandboxFrom = '+14155238886';
const personalFrom = env.TWILIO_PHONE_NUMBER;

async function runTests() {
    console.log('--- WhatsApp Multi-Sender Test ---');

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
        console.error('Missing credentials');
        return;
    }

    const client = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    // Test 1: Standard Sandbox
    console.log(`\nTest 1: Trying standard sandbox (${sandboxFrom})...`);
    try {
        const res = await client.messages.create({
            body: 'Test 1: Standard Sandbox WhatsApp Sender',
            from: `whatsapp:${sandboxFrom}`,
            to: `whatsapp:${targetPhone}`
        });
        console.log('✅ Success! SID:', res.sid);
    } catch (err: any) {
        console.log('❌ Failed:', err.message);
    }

    // Test 2: Personal Number
    if (personalFrom) {
        console.log(`\nTest 2: Trying personal number (${personalFrom})...`);
        try {
            const res = await client.messages.create({
                body: 'Test 2: Personal Twilio Number WhatsApp Sender',
                from: `whatsapp:${personalFrom}`,
                to: `whatsapp:${targetPhone}`
            });
            console.log('✅ Success! SID:', res.sid);
        } catch (err: any) {
            console.log('❌ Failed:', err.message);
        }
    }
}

runTests().catch(console.error);
