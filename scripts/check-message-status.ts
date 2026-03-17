import 'dotenv/config';
import Twilio from 'twilio';
import { env } from '../src/config/env.config.js';

const messageSid = 'SMdd3c9f4ddde72cd6363434214c353335';

async function checkStatus() {
    console.log('--- Checking Message Status ---');
    console.log('SID:', messageSid);

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
        console.error('Missing credentials in .env');
        return;
    }

    const client = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    try {
        const message = await client.messages(messageSid).fetch();
        console.log('Status:', message.status);
        console.log('To:', message.to);
        console.log('From:', message.from);
        console.log('Date Sent:', message.dateSent);
        console.log('Error Code:', message.errorCode);
        console.log('Error Message:', message.errorMessage);

        if (message.status === 'failed' || message.status === 'undelivered') {
            console.error('❌ Message failed to deliver.');
        } else if (message.status === 'delivered') {
            console.log('✅ Message delivered!');
        } else {
            console.log('ℹ️ Message is still:', message.status);
        }
    } catch (err: any) {
        console.error('❌ Failed to fetch message status:', err.message);
    }
}

checkStatus().catch(console.error);
