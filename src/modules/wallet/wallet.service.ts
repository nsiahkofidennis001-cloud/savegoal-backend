import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';

export class WalletService {
    /**
     * Create a wallet for a user
     * Should be called when a user registers
     */
    static async createWallet(userId: string) {
        const existing = await prisma.wallet.findUnique({
            where: { userId },
        });

        if (existing) {
            return existing;
        }

        return prisma.wallet.create({
            data: {
                userId,
                currency: 'GHS',
                balance: 0.0,
            },
        });
    }

    /**
     * Get user's wallet
     */
    static async getWallet(userId: string) {
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            // Auto-create if not exists (for existing users from Phase 1)
            return this.createWallet(userId);
        }

        return wallet;
    }

    /**
     * Deposit funds into wallet (Manual/Mock for now)
     */
    static async deposit(userId: string, amount: number, reference?: string) {
        if (amount <= 0) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Amount must be positive');
        }

        return prisma.$transaction(async (tx) => {
            let wallet = await tx.wallet.findUnique({ where: { userId } });

            if (!wallet) {
                // Auto-create if not exists
                wallet = await tx.wallet.create({
                    data: {
                        userId,
                        currency: 'GHS',
                        balance: 0.0,
                    },
                });
            }

            // Create transaction record
            const transaction = await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'DEPOSIT',
                    amount: amount,
                    status: 'COMPLETED',
                    reference: reference || `DEP-${Date.now()}`,
                    metadata: { method: 'manual_mock' },
                },
            });

            // Update wallet balance
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: {
                        increment: amount,
                    },
                },
            });

            return { wallet: updatedWallet, transaction };
        });
    }
}
