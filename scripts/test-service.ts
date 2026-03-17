import 'dotenv/config';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { prisma } from '../src/infra/prisma.client.js';

/**
 * STANDALONE NOTIFICATION SERVICE TEST
 * 
 * Verifies that NotificationService.send handles the Twilio integration correctly.
 */
async function testService() {
    console.log('--- Testing NotificationService Integration ---');

    // We'll use a real user from the database if available, or just a mock one
    // But since the service calls prisma.user.findUnique, we should at least check for an existing user.
    const user = await prisma.user.findFirst();

    if (!user) {
        console.error('No users found in database. Please run the app first to create a user.');
        process.exit(1);
    }

    console.log(`Using user: ${user.name} (${user.id}) - Phone: ${user.phone}`);

    const payload = {
        userId: user.id,
        title: 'Service Test',
        message: 'Notification via Service Layer 🚀',
        channels: ['SMS', 'IN_APP'] as any
    };

    console.log('Attempting to send notification via SMS and IN_APP...');
    const results = await NotificationService.send(payload);

    console.log('\n--- Results ---');
    console.log('In-App Status:', results.inApp ? '✅ Success' : '❌ Failed');
    console.log('SMS Status:', results.sms && results.sms !== 'DEV_MODE_MOCK' ? '✅ Success (Twilio)' : (results.sms === 'DEV_MODE_MOCK' ? 'ℹ️ Mocked (Dev Mode)' : '❌ Failed'));

    if (results.smsError) {
        console.error('SMS Error:', results.smsError);
    }

    if (results.sms && results.sms !== 'DEV_MODE_MOCK') {
        console.log('Twilio Message SID:', results.sms.sid);
    }

    console.log('\n--- Verification Complete ---');
}

testService().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
