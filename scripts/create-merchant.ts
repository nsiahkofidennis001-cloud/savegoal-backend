import { auth } from '../src/modules/auth/auth.js';
import { prisma } from '../src/infra/prisma.client.js';
import { WalletService } from '../src/modules/wallet/wallet.service.js';

/**
 * Seed a test merchant account for local development.
 * Usage: npx tsx scripts/create-merchant.ts
 */
async function createMerchant() {
    const email = 'merchant@test.com';
    const password = 'password123';
    const name = 'Test Merchant';
    const businessName = 'Test Store GH';

    console.log(`\n Creating merchant: ${email}...`);

    try {
        let userId: string;

        const existing = await prisma.user.findUnique({ where: { email } });

        if (existing) {
            console.log('User already exists, reusing...');
            userId = existing.id;
        } else {
            const authResponse = await auth.api.signUpEmail({
                body: { email, password, name },
            });

            if (!authResponse?.user) {
                console.error('Failed to create user via auth.');
                process.exit(1);
            }
            userId = authResponse.user.id;
            console.log('User account created.');
        }

        // Promote to MERCHANT role, mark email verified, and set phone
        await prisma.user.update({
            where: { id: userId },
            data: {
                role: 'MERCHANT',
                emailVerified: true,
                phone: '+233201234567',
            },
        });

        // Upsert merchant profile with all fields completed and verified
        const profileData = {
            userId,
            businessName,
            registrationNo: 'GH-BUS-2024-10234',
            contactEmail: email,
            contactPhone: '+233201234567',
            businessAddress: '123 Accra Mall, Spintex Road, Accra, Ghana',
            bankName: 'Ghana Commercial Bank',
            bankAccountNo: '1234567890',
            bankAccountName: 'Test Store GH',
            isVerified: true,
        };

        const existingProfile = await prisma.merchantProfile.findUnique({ where: { userId } });
        if (!existingProfile) {
            await prisma.merchantProfile.create({ data: profileData });
            console.log('Merchant profile created.');
        } else {
            await prisma.merchantProfile.update({ where: { userId }, data: profileData });
            console.log('Merchant profile updated with full details.');
        }

        await prisma.profile.upsert({
            where: { userId },
            create: {
                id: `profile-${userId}`,
                userId,
                firstName: 'Test',
                lastName: 'Merchant',
                address: '123 Accra Mall, Spintex Road, Accra, Ghana',
                occupation: 'Merchant',
                kycStatus: 'VERIFIED',
                kycVerifiedAt: new Date(),
                selfieVerified: true,
                selfieMatchScore: 0.99,
                bankName: 'Ghana Commercial Bank',
                bankAccountNo: '1234567890',
                bankAccountName: businessName,
                notifyInApp: true,
                notifySms: true,
                notifyWhatsapp: false,
                notifyEmail: true,
            },
            update: {
                firstName: 'Test',
                lastName: 'Merchant',
                address: '123 Accra Mall, Spintex Road, Accra, Ghana',
                occupation: 'Merchant',
                kycStatus: 'VERIFIED',
                kycVerifiedAt: new Date(),
                selfieVerified: true,
                selfieMatchScore: 0.99,
                bankName: 'Ghana Commercial Bank',
                bankAccountNo: '1234567890',
                bankAccountName: businessName,
                notifyInApp: true,
                notifySms: true,
                notifyWhatsapp: false,
                notifyEmail: true,
            },
        });
        console.log('Merchant KYC/profile created or verified.');

        // Create wallet
        try {
            await WalletService.createWallet(userId);
            console.log('Wallet created.');
        } catch {
            console.warn('Wallet may already exist, skipping.');
        }

        console.log(`\n Merchant ready!`);
        console.log(`   Email:    ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Business: ${businessName}\n`);
        process.exit(0);
    } catch (err: any) {
        console.error('Error:', err.message || err);
        process.exit(1);
    }
}

createMerchant();
