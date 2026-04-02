import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';
import { NotificationService } from '../notifications/notification.service.js';

export class GoalsService {
    /**
     * Create a new savings goal
     */
    static async createGoal(userId: string, data: {
        name: string;
        targetAmount?: number;
        deadline?: string;
        description?: string;
        productId?: string;
        category?: 'PERSONAL' | 'CONTRIBUTION' | 'SNBL';
        isRecurring?: boolean;
        monthlyAmount?: number;
        savingsDay?: number;
    }) {
        let finalTargetAmount = data.targetAmount;
        let finalCategory = data.category || 'PERSONAL';

        // If productId is provided, fetch product and set target amount
        if (data.productId) {
            finalCategory = 'SNBL';
            const product = await prisma.product.findUnique({
                where: { id: data.productId }
            });

            if (!product) {
                throw new ApiException(404, 'NOT_FOUND', 'Product not found');
            }

            finalTargetAmount = Number(product.price);
        }

        if (!finalTargetAmount || finalTargetAmount <= 0) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Target amount must be positive');
        }

        return prisma.goal.create({
            data: {
                userId,
                name: data.name,
                targetAmount: finalTargetAmount,
                deadline: data.deadline ? new Date(data.deadline) : undefined,
                description: data.description,
                productId: data.productId,
                status: 'ACTIVE',
                category: finalCategory as any,
                isRecurring: data.isRecurring || false,
                monthlyAmount: data.monthlyAmount,
                savingsDay: data.savingsDay,
            },
        });
    }

    /**
     * Update recurring savings settings for a goal
     */
    static async updateRecurringSettings(userId: string, goalId: string, data: {
        isRecurring?: boolean;
        monthlyAmount?: number;
        savingsDay?: number;
    }) {
        await this.getGoal(userId, goalId);

        return prisma.goal.update({
            where: { id: goalId },
            data: {
                isRecurring: data.isRecurring,
                monthlyAmount: data.monthlyAmount,
                savingsDay: data.savingsDay,
            }
        });
    }

    /**
     * List user's goals
     */
    static async getUserGoals(userId: string) {
        return prisma.goal.findMany({
            where: { userId },
            include: { product: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get single goal details
     */
    static async getGoal(userId: string, goalId: string) {
        const goal = await prisma.goal.findUnique({
            where: { id: goalId },
            include: { product: true },
        });

        if (!goal || goal.userId !== userId) {
            throw new ApiException(404, 'NOT_FOUND', 'Goal not found');
        }

        return goal;
    }

    /**
     * Fund a goal from wallet
     */
    static async fundGoal(userId: string, goalId: string, amount: number) {
        if (amount <= 0) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Amount must be positive');
        }

        return prisma.$transaction(async (tx) => {
            // 1. Get Goal & Verify
            const goal = await tx.goal.findUnique({ where: { id: goalId } });
            if (!goal || goal.userId !== userId) {
                throw new ApiException(404, 'NOT_FOUND', 'Goal not found');
            }

            if (goal.status !== 'ACTIVE') {
                throw new ApiException(400, 'VALIDATION_ERROR', 'Goal is not active');
            }

            // 2. Get Wallet & Verify Balance
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

            if (wallet.balance.lessThan(amount)) {
                throw new ApiException(400, 'VALIDATION_ERROR', 'Insufficient wallet balance');
            }

            // 3. Deduct from Wallet
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { decrement: amount } },
            });

            // 4. Add to Goal
            const updatedGoal = await tx.goal.update({
                where: { id: goal.id },
                data: { currentAmount: { increment: amount } },
            });

            // 5. Create Transaction Record
            const transaction = await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    goalId: goal.id,
                    type: 'GOAL_FUNDING',
                    amount: amount,
                    status: 'COMPLETED',
                    reference: `FUND-${goal.id}-${Date.now()}`,
                },
            });

            // 6. Check if goal reached
            if (updatedGoal.currentAmount.greaterThanOrEqualTo(updatedGoal.targetAmount)) {
                await tx.goal.update({
                    where: { id: goal.id },
                    data: { status: 'COMPLETED' },
                });
            }

            // 7. Notify User
            await NotificationService.send({
                userId,
                title: updatedGoal.status === 'COMPLETED' ? 'Goal Completed! 🎉' : 'Goal Funded',
                message: updatedGoal.status === 'COMPLETED'
                    ? `Congratulations! You've reached your target of ${updatedGoal.targetAmount} GHS for "${updatedGoal.name}".`
                    : `You added ${amount} GHS to "${updatedGoal.name}". New balance: ${updatedGoal.currentAmount} GHS.`,
                category: 'GOAL_UPDATE',
                channels: ['IN_APP']
            });

            return { goal: updatedGoal, transaction };
        });
    }

    /**
     * Cancel an active goal and refund 95% of the current amount to the wallet
     */
    static async cancelGoal(userId: string, goalId: string) {
        return prisma.$transaction(async (tx) => {
            // 1. Get Goal & Verify
            const goal = await tx.goal.findUnique({
                where: { id: goalId }
            });

            if (!goal || goal.userId !== userId) {
                throw new ApiException(404, 'NOT_FOUND', 'Goal not found');
            }

            if (goal.status !== 'ACTIVE') {
                throw new ApiException(400, 'VALIDATION_ERROR', `Only ACTIVE goals can be cancelled. Current status: ${goal.status}`);
            }

            const currentAmount = goal.currentAmount;

            // 2. Perform refund if there are funds
            if (currentAmount.greaterThan(0)) {
                const refundAmount = currentAmount.mul(0.95);
                const penaltyAmount = currentAmount.mul(0.05);

                // Find or create wallet
                let wallet = await tx.wallet.findUnique({ where: { userId } });
                if (!wallet) {
                    wallet = await tx.wallet.create({
                        data: { userId, balance: 0, currency: 'GHS' }
                    });
                }

                // Credit Wallet
                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: refundAmount } }
                });

                // Create Refund Transaction
                await tx.transaction.create({
                    data: {
                        walletId: wallet.id,
                        goalId: goal.id,
                        type: 'GOAL_WITHDRAWAL' as any,
                        amount: refundAmount,
                        status: 'COMPLETED',
                        reference: `CANCEL-REFUND-${goal.id}-${Date.now()}`
                    }
                });

                // Create Penalty Transaction
                await tx.transaction.create({
                    data: {
                        walletId: wallet.id,
                        goalId: goal.id,
                        type: 'CANCEL_PENALTY' as any,
                        amount: penaltyAmount,
                        status: 'COMPLETED',
                        reference: `CANCEL-PENALTY-${goal.id}-${Date.now()}`
                    }
                });
            }

            // 3. Mark goal as cancelled
            const updatedGoal = await tx.goal.update({
                where: { id: goalId },
                data: {
                    status: 'CANCELLED',
                    currentAmount: 0
                }
            });

            // 4. Notify User
            await NotificationService.send({
                userId,
                title: 'Goal Cancelled',
                message: `Your goal "${goal.name}" has been cancelled. ${currentAmount.greaterThan(0) ? '95% of your savings have been refunded to your wallet.' : ''}`,
                category: 'GOAL_UPDATE',
                channels: ['IN_APP']
            });

            return { status: 'success', goal: updatedGoal };
        });
    }

    /**
     * Redeem a completed goal to pay a merchant
     */
    static async redeemGoal(userId: string, goalId: string) {
        return prisma.$transaction(async (tx) => {
            // 1. Get Goal & Verify
            const goal = await tx.goal.findUnique({
                where: { id: goalId },
                include: {
                    product: { include: { merchant: true } },
                    user: {
                        include: {
                            profile: true,
                        },
                    },
                }
            });

            if (!goal || goal.userId !== userId) {
                throw new ApiException(404, 'NOT_FOUND', 'Goal not found');
            }

            if (goal.status !== 'COMPLETED') {
                throw new ApiException(400, 'VALIDATION_ERROR', 'Only completed goals can be redeemed');
            }

            if (!goal.productId || !goal.product) {
                throw new ApiException(400, 'VALIDATION_ERROR', 'This goal is not linked to a merchant product');
            }

            // 2. Archive goal
            await tx.goal.update({
                where: { id: goalId },
                data: { status: 'ARCHIVED' }
            });

            // 3. Credit Merchant
            await tx.merchantProfile.update({
                where: { id: goal.product.merchantProfileId },
                data: {
                    balance: { increment: goal.currentAmount }
                }
            });

            // 4. Create Payout Transaction
            const transaction = await tx.transaction.create({
                data: {
                    walletId: (await tx.wallet.findUnique({ where: { userId } }))!.id,
                    merchantProfileId: goal.product.merchantProfileId,
                    goalId: goal.id,
                    type: 'MERCHANT_PAYOUT' as any,
                    amount: goal.currentAmount,
                    status: 'COMPLETED',
                    reference: `PAYOUT-${goal.id}-${Date.now()}`,
                    metadata: {
                        merchantId: goal.product.merchantProfileId,
                        entryType: 'MERCHANT_ORDER',
                        productId: goal.productId,
                        productName: goal.product.name,
                        customerName: goal.user.name,
                        customerEmail: goal.user.email,
                        customerPhone: goal.user.phone,
                        shippingAddress: goal.user.profile?.address,
                        orderStatus: 'PROCESSING',
                    }
                }
            });

            // 5. Notify Merchant & User
            await NotificationService.send({
                userId: goal.userId,
                title: 'Goal Redeemed',
                message: `Your goal "${goal.name}" has been redeemed for "${goal.product!.name}".`,
                category: 'GOAL_UPDATE',
                channels: ['IN_APP', 'WHATSAPP']
            });

            return { status: 'success', message: 'Goal redeemed and merchant paid', transaction };
        });
    }
}
