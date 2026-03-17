import 'dotenv/config';
import Twilio from 'twilio';
import { env } from '../src/config/env.config.js';

const targetPhone = '+233546351309';
const sandboxFrom = '+14155238886'; // Standard Twilio Sandbox WhatsApp number

async function testWhatsApp() {
    console.log('--- Twilio WhatsApp Test ---');
    console.log('Target:', `whatsapp:${targetPhone}`);

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
        console.error('Missing credentials in .env');
        return;
    }

    const client = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    try {
        const res = await client.messages.create({
            body: 'Hello! This is a test message from your SaveGoal app via WhatsApp. If you see this, WhatsApp integration is working! 🚀',
            from: `whatsapp:${sandboxFrom}`,
            to: `whatsapp:${targetPhone}`
        });
        console.log('✅ WhatsApp message queued!');
        console.log('SID:', res.sid);
        console.log('Status:', res.status);
        console.log('\nIMPORTANT: If status is "failed", ensure you have sent "join space-rock" to +1 415 523 8886 first.');
    } catch (err: any) {
        console.error('❌ WhatsApp Error:');
        console.error('Code:', err.code);
        console.error('Message:', err.message);
    }
}

testWhatsApp().catch(console.error);
