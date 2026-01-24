import { prisma } from '../../infra/prisma.client.js';
import { PaystackProvider } from './providers/paystack.provider.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';
import { WalletService } from '../wallet/wallet.service.js';

export class PaymentService {
    /**
     * Initialize a deposit
     * Creates a pending transaction and returns the payment URL
     */
    static async initializeDeposit(userId: string, amount: number) {
        // 1. Get user and wallet
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { wallet: true },
        });

        if (!user || !user.wallet) {
            throw new ApiException(404, 'NOT_FOUND', 'User or wallet not found');
        }

        // 2. Generate unique reference
        const reference = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 3. Initialize Paystack
        const paystackRes = await PaystackProvider.initializeTransaction({
            email: user.email,
            amount,
            reference,
            metadata: {
                userId,
                walletId: user.wallet.id,
                type: 'DEPOSIT',
            },
        });

        // 4. Create PENDING transaction in DB
        await prisma.transaction.create({
            data: {
                walletId: user.wallet.id,
                amount,
                type: 'DEPOSIT',
                status: 'PENDING',
                reference,
                metadata: {
                    paystack_access_code: paystackRes.data.access_code,
                },
            },
        });

        return {
            authorization_url: paystackRes.data.authorization_url,
            reference,
        };
    }

    /**
     * Fulfill a payment (via webhook or manual verify)
     */
    static async fulfillPayment(reference: string) {
        return prisma.$transaction(async (tx) => {
            // 1. Find the pending transaction
            const transaction = await tx.transaction.findFirst({
                where: { reference, status: 'PENDING' },
            });

            if (!transaction) {
                console.warn(`Transaction not found or already processed: ${reference}`);
                return;
            }

            // 2. Verify with Paystack to be 100% sure
            const paystackData = await PaystackProvider.verifyTransaction(reference);

            if (paystackData.data.status !== 'success') {
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 'FAILED', metadata: { ... (transaction.metadata as object), error: 'Paystack verification failed' } },
                });
                return;
            }

            // 3. Update Transaction to COMPLETED
            await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'COMPLETED',
                    metadata: {
                        ...(transaction.metadata as object),
                        paystack_raw: paystackData.data,
                    },
                },
            });

            // 4. Credit the Wallet
            await tx.wallet.update({
                where: { id: transaction.walletId },
                data: {
                    balance: {
                        increment: transaction.amount,
                    },
                },
            });

            console.info(`✅ Successfully fulfilled deposit for reference: ${reference}`);
        });
    }
}
