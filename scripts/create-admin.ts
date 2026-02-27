import { auth } from '../src/modules/auth/auth.js';
import { prisma } from '../src/infra/prisma.client.js';
import { WalletService } from '../src/modules/wallet/wallet.service.js';

/**
 * Script to create an Admin user securely from the command line.
 * Usage: npx tsx scripts/create-admin.ts email=admin@example.com password=password123 name="Admin Name"
 */
async function createAdmin() {
    const args = process.argv.slice(2).reduce((acc: any, arg) => {
        const [key, value] = arg.split('=');
        if (key && value) acc[key] = value;
        return acc;
    }, {});

    const { email, password, name } = args;

    if (!email || !password || !name) {
        console.error('❌ Error: email, password, and name are required as key=value pairs.');
        console.log('Example: npx tsx scripts/create-admin.ts email=admin@example.com password=secret name="Admin User"');
        process.exit(1);
    }

    console.log(`🚀 Creating admin user: ${email}...`);

    try {
        // 1. Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            console.error(`❌ Error: User with email ${email} already exists.`);
            process.exit(1);
        }

        // 2. Create user via better-auth (to handle hashing properly)
        const authResponse = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            },
        });

        if (!authResponse || !authResponse.user) {
            console.error('❌ Error: Failed to create user via better-auth.');
            process.exit(1);
        }

        const user = authResponse.user;

        // 3. Update role to ADMIN
        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' },
        });

        console.log('✅ User role updated to ADMIN.');

        // 4. Create Wallet
        try {
            await WalletService.createWallet(user.id);
            console.log('✅ Wallet created for admin.');
        } catch (walletError) {
            console.warn('⚠️ Warning: Failed to create wallet, it may need to be created manually.');
        }

        console.log(`\n🎉 Admin user created successfully!\nEmail: ${email}\nName: ${name}\nID: ${user.id}\n`);
        process.exit(0);
    } catch (err: any) {
        console.error('❌ Unexpected Error:', err.message || err);
        process.exit(1);
    }
}

createAdmin();
