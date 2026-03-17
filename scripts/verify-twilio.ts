import 'dotenv/config';
import Twilio from 'twilio';
import { env } from '../src/config/env.config.js';

/**
 * MANUAL TWILIO VERIFICATION SCRIPT

 * 
 * This script bypasses the service layer to test the Twilio client directly.
 */
async function verifyTwilio() {
    console.log('--- Twilio Configuration Check ---');
    console.log('ACCOUNT_SID:', env.TWILIO_ACCOUNT_SID ? '✅ Present' : '❌ Missing');
    console.log('AUTH_TOKEN:', env.TWILIO_AUTH_TOKEN ? '✅ Present' : '❌ Missing');
    console.log('PHONE_NUMBER:', env.TWILIO_PHONE_NUMBER || '❌ Missing');

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
        console.error('\nMissing Twilio credentials in environment variables.');
        process.exit(1);
    }

    const client = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    console.log('\n--- Attempting to send Test SMS ---');
    try {
        // Use a test number or the user's provided test number if available
        const testTo = env.TEST_PHONE_NUMBER || '+233241234567'; // Default to a placeholder if none set

        console.log(`Sending SMS from ${env.TWILIO_PHONE_NUMBER} to ${testTo}...`);

        const message = await client.messages.create({
            body: 'SaveGoal Twilio Integration Test: SMS is working! 🚀',
            from: env.TWILIO_PHONE_NUMBER,
            to: testTo
        });

        console.log('✅ SMS Sent successfully!');
        console.log('Message SID:', message.sid);
    } catch (err: any) {
        console.error('❌ SMS Failed:', err.message);
    }

    console.log('\n--- Attempting to send Test WhatsApp ---');
    try {
        const testTo = env.TEST_PHONE_NUMBER || '+233241234567';

        console.log(`Sending WhatsApp from ${env.TWILIO_PHONE_NUMBER} to ${testTo}...`);

        const message = await client.messages.create({
            body: '*SaveGoal Twilio Integration Test*: WhatsApp is working! 📱',
            from: `whatsapp:${env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${testTo}`
        });

        console.log('✅ WhatsApp Sent successfully!');
        console.log('Message SID:', message.sid);
    } catch (err: any) {
        console.error('❌ WhatsApp Failed:', err.message);
        console.log('Note: WhatsApp requires the sender number to be enabled in the Twilio Sandbox or approved.');
    }
}

verifyTwilio().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
