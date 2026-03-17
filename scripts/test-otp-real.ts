import 'dotenv/config';
import Twilio from 'twilio';
import { env } from '../src/config/env.config.js';

const targetPhone = '+233546351309';

async function testDirect() {
    console.log('--- Direct Twilio Test ---');
    console.log('Sending to:', targetPhone);
    console.log('Using Account SID:', env.TWILIO_ACCOUNT_SID);
    console.log('Using Phone Number:', env.TWILIO_PHONE_NUMBER);

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
        console.error('Missing credentials in .env');
        return;
    }

    const client = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    try {
        const res = await client.messages.create({
            body: 'SaveGoal Direct Test: Your OTP is 123456',
            from: env.TWILIO_PHONE_NUMBER,
            to: targetPhone
        });
        console.log('✅ Message SID:', res.sid);
        console.log('Status:', res.status);
    } catch (err: any) {
        console.error('❌ Twilio Error Details:');
        console.error('Code:', err.code);
        console.error('Status:', err.status);
        console.error('Message:', err.message);
        console.error('More Info:', err.moreInfo);
    }
}

testDirect().catch(console.error);
