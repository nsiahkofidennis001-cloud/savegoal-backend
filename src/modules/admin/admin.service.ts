import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';

import { NotificationService } from '../notifications/notification.service.js';

export class AdminService {
    /**
     * Get aggregate system statistics
     */
    static async getSystemStats() {
        const [
            userCount,
            merchantCount,
            activeGoals,
            totalSaved,
            totalTransactions
        ] = await Promise.all([
            prisma.user.count(),
            prisma.merchantProfile.count(),
            prisma.goal.count({ where: { status: 'ACTIVE' } }),
            prisma.goal.aggregate({
                _sum: { currentAmount: true }
            }),
            prisma.transaction.count()
        ]);

        return {
            users: userCount,
            merchants: merchantCount,
            activeGoals,
            totalSavedGHS: totalSaved._sum.currentAmount || 0,
            totalTransactions
        };
    }

    /**
     * List all users with pagination
     */
    static async listUsers(page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                skip,
                take: limit,
                include: {
                    profile: true,
                    wallet: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count()
        ]);

        return {
            users,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * List all merchants with verification status
     */
    static async listMerchants() {
        return prisma.merchantProfile.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * List all pending KYC submissions
     */
    static async listPendingKyc() {
        return prisma.profile.findMany({
            where: { kycStatus: 'PENDING' },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    /**
     * Verify or Reject a KYC submission
     */
    static async verifyKyc(userId: string, status: 'VERIFIED' | 'FAILED', note?: string) {
        const profile = await prisma.profile.findUnique({
            where: { userId }
        });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'User profile not found');
        }

        return prisma.profile.update({
            where: { userId },
            data: {
                kycStatus: status,
                kycNote: note
            }
        });
    }

    /**
     * List all pending merchant payout requests
     */
    static async listPendingPayouts() {
        return prisma.transaction.findMany({
            where: {
                status: 'PENDING',
                type: 'MERCHANT_PAYOUT'
            },
            include: {
                wallet: {
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                },
                merchant: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Approve or Reject a merchant payout
     */
    static async processPayout(transactionId: string, status: 'COMPLETED' | 'FAILED', note?: string) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { merchant: true }
        });

        if (!transaction || transaction.type !== 'MERCHANT_PAYOUT') {
            throw new ApiException(404, 'NOT_FOUND', 'Payout transaction not found');
        }

        if (transaction.status !== 'PENDING') {
            throw new ApiException(400, 'BAD_REQUEST', 'Transaction is already processed');
        }

        return prisma.$transaction(async (tx) => {
            // 1. Update Transaction
            const updatedTx = await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status,
                    metadata: {
                        ...(transaction.metadata as object),
                        adminNote: note,
                        processedAt: new Date()
                    }
                }
            });

            // 2. If rejected, restore the merchant balance
            if (status === 'FAILED' && transaction.merchantProfileId) {
                await tx.merchantProfile.update({
                    where: { id: transaction.merchantProfileId },
                    data: { balance: { increment: transaction.amount } }
                });
            }

            // 3. Notify Merchant
            const merchant = await tx.merchantProfile.findUnique({
                where: { id: transaction.merchantProfileId! },
                include: { user: true }
            });

            if (merchant) {
                await NotificationService.send({
                    userId: merchant.userId,
                    title: status === 'COMPLETED' ? 'Payout Successful' : 'Payout Failed',
                    message: status === 'COMPLETED'
                        ? `Your payout of ${transaction.amount} GHS has been successfully processed.`
                        : `Your payout of ${transaction.amount} GHS failed and has been refunded to your balance. Note: ${note || 'None'}`,
                    category: 'TRANSACTION',
                    channels: ['IN_APP', 'WHATSAPP']
                });
            }

            return updatedTx;
        });
    }

    /**
     * Verify or reject a merchant
     */
    static async verifyMerchant(merchantId: string, isVerified: boolean) {
        const merchant = await prisma.merchantProfile.findUnique({
            where: { id: merchantId }
        });

        if (!merchant) {
            throw new ApiException(404, 'NOT_FOUND', 'Merchant profile not found');
        }

        return prisma.merchantProfile.update({
            where: { id: merchantId },
            data: { isVerified }
        });
    }

    /**
     * Get global transaction history
     */
    static async getGlobalTransactions(page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                skip,
                take: limit,
                include: {
                    wallet: {
                        include: {
                            user: {
                                select: { name: true, email: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.transaction.count()
        ]);

        return {
            transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
