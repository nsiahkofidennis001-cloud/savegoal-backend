import { auth } from './src/modules/auth/auth.js';
import { prisma } from './src/infra/prisma.client.js';

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function test() {
    console.log('Starting test...');
    try {
        let user = await prisma.user.findFirst();
        if (!user) {
            console.log('No user found, creating one...');
            user = await prisma.user.create({
                data: {
                    name: 'Test user',
                    email: `test-${Date.now()}@example.com`,
                    emailVerified: true,
                }
            });
        }
        console.log('Using user:', user.email);

        const { internalAdapter } = await auth.$context;
        console.log('Got internalAdapter');

        const session = await internalAdapter.createSession(user.id);
        console.log('Session created successfully:', session);
    } catch (e) {
        console.error('Test failed with error:', e);
    } finally {
        await prisma.$disconnect();
        console.log('Disconnected from DB');
        process.exit(0);
    }
}

test();
