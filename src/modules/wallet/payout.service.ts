import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';
import { TransactionType, TransactionStatus } from '@prisma/client';

export class PayoutService {
    /**
     * Request a payout for a merchant
     * Deducts merchant balance immediately and creates a PENDING transaction
     */
    static async requestMerchantPayout(userId: string, amount: number) {
        if (amount <= 0) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Amount must be positive');
        }

        return prisma.$transaction(async (tx) => {
            const merchant = await tx.merchantProfile.findUnique({
                where: { userId },
                include: { user: { include: { wallet: true } } }
            });

            if (!merchant) {
                throw new ApiException(404, 'NOT_FOUND', 'Merchant profile not found');
            }

            if (!merchant.user.wallet) {
                throw new ApiException(404, 'NOT_FOUND', 'Merchant wallet not found');
            }

            if (merchant.balance.lessThan(amount)) {
                throw new ApiException(400, 'INSUFFICIENT_BALANCE', 'Insufficient merchant balance');
            }

            const balanceBefore = merchant.balance;
            const balanceAfter = balanceBefore.sub(amount);

            // 1. Deduct from merchant balance immediately
            await tx.merchantProfile.update({
                where: { id: merchant.id },
                data: { balance: { decrement: amount } }
            });

            // 2. Create PENDING transaction linked to merchant profile with snapshots
            const transaction = await tx.transaction.create({
                data: {
                    walletId: merchant.user.wallet.id,
                    merchantProfileId: merchant.id,
                    type: TransactionType.MERCHANT_PAYOUT,
                    amount: amount,
                    status: TransactionStatus.PENDING,
                    reference: `PO-${Date.now()}`,
                    balanceBefore: balanceBefore,
                    balanceAfter: balanceAfter,
                    metadata: {
                        requestedAt: new Date(),
                        bankName: merchant.bankName,
                        accountNo: merchant.bankAccountNo,
                        accountName: merchant.bankAccountName
                    }
                }
            });

            // 3. Record Audit Log
            const { AuditLogger } = await import('../../shared/utils/audit.util.js');
            await AuditLogger.recordTx(tx, {
                userId,
                action: 'PAYOUT_REQUEST',
                resource: 'MerchantProfile',
                resourceId: merchant.id,
                newValue: { amount, transactionId: transaction.id }
            });

            return transaction;
        });
    }

    /**
     * Approve a pending payout
     */
    static async approvePayout(adminId: string, transactionId: string) {
        return prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.findUnique({
                where: { id: transactionId },
                include: { merchant: true }
            });

            if (!transaction || transaction.type !== 'MERCHANT_PAYOUT' || transaction.status !== 'PENDING') {
                throw new ApiException(400, 'BAD_REQUEST', 'Invalid or non-pending payout transaction');
            }

            // Update status to COMPLETED
            const updated = await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: TransactionStatus.COMPLETED,
                    metadata: {
                        ...(transaction.metadata as object),
                        approvedAt: new Date(),
                        approvedBy: adminId
                    }
                }
            });

            // Record Audit Log
            const { AuditLogger } = await import('../../shared/utils/audit.util.js');
            await AuditLogger.recordTx(tx, {
                userId: adminId,
                action: 'PAYOUT_APPROVE',
                resource: 'Transaction',
                resourceId: transactionId,
                newValue: { status: 'COMPLETED' }
            });

            return updated;
        });
    }

    /**
     * Reject a pending payout
     * Reverts the merchant's balance
     */
    static async rejectPayout(adminId: string, transactionId: string, reason: string) {
        return prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.findUnique({
                where: { id: transactionId },
                include: { merchant: true }
            });

            if (!transaction || transaction.type !== 'MERCHANT_PAYOUT' || transaction.status !== 'PENDING') {
                throw new ApiException(400, 'BAD_REQUEST', 'Invalid or non-pending payout transaction');
            }

            // 1. Revert Merchant Balance
            await tx.merchantProfile.update({
                where: { id: transaction.merchantProfileId! },
                data: {
                    balance: { increment: transaction.amount }
                }
            });

            // 2. Update status to FAILED
            const updated = await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: TransactionStatus.FAILED,
                    metadata: {
                        ...(transaction.metadata as object),
                        rejectedAt: new Date(),
                        rejectedBy: adminId,
                        reason
                    }
                }
            });

            // 3. Record Audit Log
            const { AuditLogger } = await import('../../shared/utils/audit.util.js');
            await AuditLogger.recordTx(tx, {
                userId: adminId,
                action: 'PAYOUT_REJECT',
                resource: 'Transaction',
                resourceId: transactionId,
                newValue: { status: 'FAILED', reason }
            });

            return updated;
        });
    }
}
