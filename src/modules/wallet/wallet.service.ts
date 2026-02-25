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
            // 1. Get current balance
            const wallet = await tx.wallet.findUnique({ where: { userId } });

            if (!wallet) {
                throw new ApiException(404, 'NOT_FOUND', 'Wallet not found');
            }

            const balanceBefore = wallet.balance;
            const balanceAfter = balanceBefore.add(amount);

            // 2. Create transaction record with snapshots
            const transaction = await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'DEPOSIT',
                    amount: amount,
                    status: 'COMPLETED',
                    reference: reference || `DEP-${Date.now()}`,
                    balanceBefore: balanceBefore,
                    balanceAfter: balanceAfter,
                    metadata: { method: 'manual_mock' },
                },
            });

            // 3. Update wallet balance
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: {
                        increment: amount,
                    },
                },
            });

            // 4. Record Audit Log
            const { AuditLogger } = await import('../../shared/utils/audit.util.js');
            await AuditLogger.recordTx(tx, {
                userId,
                action: 'WALLET_DEPOSIT',
                resource: 'Wallet',
                resourceId: wallet.id,
                newValue: { amount, reference: transaction.reference },
                oldValue: { balance: balanceBefore }
            });

            return { wallet: updatedWallet, transaction };
        });
    }

    /**
     * Withdraw funds from wallet
     */
    static async withdraw(userId: string, amount: number) {
        if (amount <= 0) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Amount must be positive');
        }

        return prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId } });

            if (!wallet) {
                throw new ApiException(404, 'NOT_FOUND', 'Wallet not found');
            }

            if (wallet.balance.lessThan(amount)) {
                throw new ApiException(400, 'INSUFFICIENT_BALANCE', 'Insufficient balance');
            }

            const balanceBefore = wallet.balance;
            const balanceAfter = balanceBefore.sub(amount);

            // 1. Create transaction
            const transaction = await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'WITHDRAWAL',
                    amount: amount,
                    status: 'COMPLETED',
                    reference: `WTH-${Date.now()}`,
                    balanceBefore: balanceBefore,
                    balanceAfter: balanceAfter,
                },
            });

            // 2. Update wallet
            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amount } },
            });

            // 3. Audit Log
            const { AuditLogger } = await import('../../shared/utils/audit.util.js');
            await AuditLogger.recordTx(tx, {
                userId,
                action: 'WALLET_WITHDRAW',
                resource: 'Wallet',
                resourceId: wallet.id,
                newValue: { amount },
                oldValue: { balance: balanceBefore }
            });

            return { wallet: updatedWallet, transaction };
        });
    }
}
