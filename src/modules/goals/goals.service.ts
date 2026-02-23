import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';
import { Decimal } from '@prisma/client/runtime/library';
import { WalletService } from '../wallet/wallet.service.js';

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
        isRecurring?: boolean;
        monthlyAmount?: number;
        savingsDay?: number;
    }) {
        let finalTargetAmount = data.targetAmount;

        // If productId is provided, fetch product and set target amount
        if (data.productId) {
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
        const goal = await this.getGoal(userId, goalId);

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
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get single goal details
     */
    static async getGoal(userId: string, goalId: string) {
        const goal = await prisma.goal.findUnique({
            where: { id: goalId },
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
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
                throw new ApiException(404, 'NOT_FOUND', 'Wallet not found');
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

            return { goal: updatedGoal, transaction };
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
                include: { product: { include: { merchant: true } } }
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
                    goalId: goal.id,
                    type: 'MERCHANT_PAYOUT' as any,
                    amount: goal.currentAmount,
                    status: 'COMPLETED',
                    reference: `PAYOUT-${goal.id}-${Date.now()}`,
                    metadata: {
                        merchantId: goal.product.merchantProfileId,
                        productId: goal.productId
                    }
                }
            });

            return { status: 'success', message: 'Goal redeemed and merchant paid', transaction };
        });
    }
}
