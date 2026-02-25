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

            const balanceBefore = wallet.balance;
            const balanceAfter = balanceBefore.sub(amount);

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

            // 5. Create Transaction Record with Snapshots
            const transaction = await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    goalId: goal.id,
                    type: 'GOAL_FUNDING',
                    amount: amount,
                    status: 'COMPLETED',
                    reference: `FUND-${goal.id}-${Date.now()}`,
                    balanceBefore: balanceBefore as any,
                    balanceAfter: balanceAfter as any,
                } as any,
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
     * Redeem a completed goal to pay a merchant
     */
    static async redeemGoal(userId: string, goalId: string) {
        return prisma.$transaction(async (tx) => {
            // 1. Get Goal & Verify
            const goal = await tx.goal.findUnique({
                where: { id: goalId },
                include: { product: { include: { merchant: true } } }
            }) as any;

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
            const merchant = goal.product.merchant;
            if (!merchant) {
                throw new ApiException(404, 'NOT_FOUND', 'Merchant profile not found');
            }

            const balanceBefore = merchant.balance;
            const balanceAfter = balanceBefore.add(goal.currentAmount);

            await tx.merchantProfile.update({
                where: { id: merchant.id },
                data: {
                    balance: { increment: goal.currentAmount }
                }
            });

            // 4. Create Merchant Credit Transaction with Snapshots
            const transaction = await tx.transaction.create({
                data: {
                    walletId: (await tx.wallet.findUnique({ where: { userId } }))!.id,
                    goalId: goal.id,
                    merchantProfileId: merchant.id,
                    type: 'MERCHANT_PAYOUT' as any,
                    amount: goal.currentAmount,
                    status: 'COMPLETED',
                    reference: `RED-${goal.id}-${Date.now()}`,
                    balanceBefore: balanceBefore as any,
                    balanceAfter: balanceAfter as any,
                    metadata: {
                        merchantId: merchant.id,
                        productId: goal.productId
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

    /**
     * Withdraw funds from a goal back to wallet
     */
    static async withdrawFromGoal(userId: string, goalId: string, amount?: number) {
        return prisma.$transaction(async (tx) => {
            const goal = await tx.goal.findUnique({ where: { id: goalId } });
            if (!goal || goal.userId !== userId) {
                throw new ApiException(404, 'NOT_FOUND', 'Goal not found');
            }

            const withdrawAmount = amount || Number(goal.currentAmount);
            if (withdrawAmount <= 0) {
                throw new ApiException(400, 'VALIDATION_ERROR', 'No funds to withdraw');
            }

            if (goal.currentAmount.lessThan(withdrawAmount)) {
                throw new ApiException(400, 'VALIDATION_ERROR', 'Insufficient goal balance');
            }

            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) throw new ApiException(404, 'NOT_FOUND', 'Wallet not found');

            const balanceBefore = wallet.balance;
            const balanceAfter = balanceBefore.add(withdrawAmount);

            // 1. Deduct from Goal
            await tx.goal.update({
                where: { id: goalId },
                data: { currentAmount: { decrement: withdrawAmount } }
            });

            // 2. Add to Wallet
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: withdrawAmount } }
            });

            // 3. Record Transaction
            const transaction = await tx.transaction.create({
                data: {
                    walletId: wallet.id,
                    goalId: goal.id,
                    type: 'WITHDRAWAL', // Reusing Withdrawal type or could be GOAL_RECLAIM
                    amount: withdrawAmount,
                    status: 'COMPLETED',
                    reference: `REC-${goal.id}-${Date.now()}`,
                    balanceBefore: balanceBefore as any,
                    balanceAfter: balanceAfter as any,
                } as any
            });

            return { status: 'success', transaction };
        });
    }

    /**
     * Get dashboard statistics for the user
     */
    static async getDashboardStats(userId: string) {
        const goals = await prisma.goal.findMany({
            where: { userId }
        });

        const activeGoals = goals.filter(g => g.status === 'ACTIVE');
        const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount), 0);

        // Find earliest next payment date
        let nextPaymentDate: Date | null = null;
        activeGoals.forEach(g => {
            if (g.isRecurring && g.savingsDay) {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                let candidate = new Date(currentYear, currentMonth, g.savingsDay);

                if (candidate < now) {
                    candidate = new Date(currentYear, currentMonth + 1, g.savingsDay);
                }

                if (!nextPaymentDate || candidate < nextPaymentDate) {
                    nextPaymentDate = candidate;
                }
            }
        });

        return {
            totalSaved,
            activeGoals: activeGoals.length,
            nextPaymentDate: (nextPaymentDate as Date | null)?.toISOString() || null
        };
    }
}
