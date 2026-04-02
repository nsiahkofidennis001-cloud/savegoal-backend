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

            let wallet = merchant.user.wallet;

            if (!wallet) {
                wallet = await tx.wallet.create({
                    data: {
                        userId,
                        currency: 'GHS',
                        balance: 0,
                    }
                });
            }

            if (!merchant.bankName || !merchant.bankAccountNo || !merchant.bankAccountName) {
                throw new ApiException(400, 'VALIDATION_ERROR', 'Add payout bank details before requesting a payout');
            }

            if (merchant.balance.lessThan(amount)) {
                throw new ApiException(400, 'INSUFFICIENT_BALANCE', 'Insufficient merchant balance');
            }

            // 1. Deduct from merchant balance immediately
            await tx.merchantProfile.update({
                where: { id: merchant.id },
                data: { balance: { decrement: amount } }
            });

            // 2. Create PENDING transaction linked to merchant profile
            return tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    merchantProfileId: merchant.id,
                    type: TransactionType.MERCHANT_PAYOUT,
                    amount: amount,
                    status: TransactionStatus.PENDING,
                    reference: `PO-${Date.now()}`,
                    metadata: {
                        entryType: 'PAYOUT_REQUEST',
                        requestedAt: new Date(),
                        bankName: merchant.bankName,
                        accountNo: merchant.bankAccountNo,
                        accountName: merchant.bankAccountName
                    }
                }
            });
        });
    }
}
