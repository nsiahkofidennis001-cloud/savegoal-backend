import 'dotenv/config';
import { EmailService } from '../src/modules/notifications/email.service.js';

async function verifySendGrid() {
    console.log('--- SendGrid Integration Test ---');

    // User can customize this if they want to test a real email
    const testRecipient = 'nsiahkofidennis001@gmail.com';

    console.log(`Attempting to send a professional test email to: ${testRecipient}`);

    try {
        const response = await EmailService.send({
            to: testRecipient,
            subject: 'SaveGoal | Professional Email Integration Verified ✅',
            text: 'Hello Dennis,\n\nThis is a professional verification email from your SaveGoal backend. Your SendGrid integration is now fully operational!\n\nBest regards,\nYour AI Engineer.',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #4CAF50;">SaveGoal | Integration Verified ✅</h2>
                    <p>Hello Dennis,</p>
                    <p>This is a professional verification email from your <strong>SaveGoal backend</strong>. Your SendGrid integration is now fully operational!</p>
                    <p>You can now send:</p>
                    <ul>
                        <li>Welcome Emails</li>
                        <li>Payment Receipts</li>
                        <li>Security Notifications</li>
                    </ul>
                    <hr>
                    <p style="font-size: 0.8em; color: #777;">Sent via SendGrid by your AI coding assistant.</p>
                </div>
            `
        });

        if (response && (response as any).mock) {
            console.log('⚠️ Running in MOCK mode (No API Key found).');
            console.log('Check your console logs above to see the email content.');
        } else {
            console.log('✅ SendGrid Connection Successful!');
            console.log('Test email has been sent to the network.');
        }
    } catch (err: any) {
        console.error('❌ SendGrid Error:');
        console.error('Message:', err.message);
        if (err.response?.body) {
            console.error('Details:', JSON.stringify(err.response.body, null, 2));
        }
    }
}

verifySendGrid().catch(console.error);
