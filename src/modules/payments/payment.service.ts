import { prisma } from '../../infra/prisma.client.js';
import { PaystackProvider } from './providers/paystack.provider.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';
import { WalletService } from '../wallet/wallet.service.js';
import { NotificationService } from '../notifications/notification.service.js';

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

    }

    /**
     * Initialize a goal funding payment
     * Direct payment into a specific goal
     */
    static async initializeGoalFunding(userId: string, goalId: string, amount: number) {
        // 1. Get user, goal and wallet
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { wallet: true },
        });

        const goal = await prisma.goal.findUnique({
            where: { id: goalId }
        });

        if (!user || !user.wallet || !goal) {
            throw new ApiException(404, 'NOT_FOUND', 'User, wallet or goal not found');
        }

        if (goal.userId !== userId) {
            throw new ApiException(403, 'FORBIDDEN', 'Unauthorized to fund this goal');
        }

        // 2. Generate unique reference
        const reference = `GF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 3. Initialize Paystack
        const paystackRes = await PaystackProvider.initializeTransaction({
            email: user.email,
            amount,
            reference,
            metadata: {
                userId,
                walletId: user.wallet.id,
                goalId,
                type: 'GOAL_FUNDING',
            },
        });

        // 4. Create PENDING transaction in DB
        await prisma.transaction.create({
            data: {
                walletId: user.wallet.id,
                goalId,
                amount,
                type: 'GOAL_FUNDING',
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
     * Verify a payment manually (Polling)
     */
    static async verifyPayment(reference: string) {
        const transaction = await prisma.transaction.findFirst({
            where: { reference }
        });

        if (!transaction) {
            throw new ApiException(404, 'NOT_FOUND', 'Transaction not found');
        }

        if (transaction.status !== 'PENDING') {
            return transaction;
        }

        // Trigger fulfillment logic (it handles the actual Paystack verification)
        await this.fulfillPayment(reference);

        return prisma.transaction.findUnique({
            where: { id: transaction.id }
        });
    }

    /**
     * Fulfill a payment (via webhook or manual verify)
     */
    static async fulfillPayment(reference: string) {
        return prisma.$transaction(async (tx) => {
            // 1. Find the pending transaction OR goal contribution
            let transaction: any = await tx.transaction.findFirst({
                where: { reference, status: 'PENDING' },
            });

            let isPublicContribution = false;

            if (!transaction) {
                // Check if it's a public contribution
                transaction = await tx.goalContribution.findFirst({
                    where: { reference, status: 'PENDING' }
                });
                if (transaction) {
                    isPublicContribution = true;
                }
            }

            if (!transaction) {
                console.warn(`Transaction/Contribution not found or already processed: ${reference}`);
                return;
            }

            // 2. Verify with Paystack to be 100% sure
            const paystackData = await PaystackProvider.verifyTransaction(reference);

            if (paystackData.data.status !== 'success') {
                if (isPublicContribution) {
                    await tx.goalContribution.update({
                        where: { id: transaction.id },
                        data: { status: 'FAILED' }
                    });
                } else {
                    await tx.transaction.update({
                        where: { id: transaction.id },
                        data: { status: 'FAILED', metadata: { ... (transaction.metadata as object), error: 'Paystack verification failed' } },
                    });
                }
                return;
            }

            // 3. Update Status to COMPLETED
            let updatedTransaction;

            if (isPublicContribution) {
                updatedTransaction = await tx.goalContribution.update({
                    where: { id: transaction.id },
                    data: { status: 'COMPLETED' },
                });

                // For public contributions, we must locate the goal's owner
                const goal = await tx.goal.findUnique({
                    where: { id: transaction.goalId },
                    include: { user: { include: { wallet: true } } }
                });

                if (goal && goal.user.wallet) {
                    // Credit the Wallet
                    await tx.wallet.update({
                        where: { id: goal.user.wallet.id },
                        data: { balance: { increment: transaction.amount } }
                    });

                    // Create a mirror Transaction record for the ledger
                    await tx.transaction.create({
                        data: {
                            walletId: goal.user.wallet.id,
                            goalId: goal.id,
                            type: 'PUBLIC_CONTRIBUTION',
                            amount: transaction.amount,
                            status: 'COMPLETED',
                            reference: transaction.reference,
                            metadata: {
                                contributorName: transaction.contributorName,
                                contributionId: transaction.id
                            }
                        }
                    });
                }
            } else {
                updatedTransaction = await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'COMPLETED',
                        metadata: {
                            ...(transaction.metadata as object),
                            paystack_raw: paystackData.data,
                        },
                    },
                });

                // 4. Handle based on type
                if (transaction.type === 'DEPOSIT') {
                    // Credit the Wallet
                    await tx.wallet.update({
                        where: { id: transaction.walletId },
                        data: {
                            balance: {
                                increment: transaction.amount,
                            },
                        },
                    });
                } else if (transaction.type === 'GOAL_FUNDING' && transaction.goalId) {
                    // Credit the Goal directly
                    const updatedGoal = await tx.goal.update({
                        where: { id: transaction.goalId },
                        data: {
                            currentAmount: {
                                increment: transaction.amount,
                            },
                        },
                    });

                    // Check if goal reached
                    if (updatedGoal.currentAmount.greaterThanOrEqualTo(updatedGoal.targetAmount)) {
                        await tx.goal.update({
                            where: { id: transaction.goalId },
                            data: { status: 'COMPLETED' },
                        });
                    }
                }
            }

            console.info(`✅ Successfully fulfilled ${transaction.type} for reference: ${reference}`);

            // 5. Notify User
            if (isPublicContribution) {
                const goal = await tx.goal.findUnique({ where: { id: transaction.goalId } });
                if (goal) {
                    await NotificationService.send({
                        userId: goal.userId,
                        title: 'New Goal Contribution! 🎉',
                        message: `${transaction.contributorName} just contributed ${transaction.amount} GHS to your goal: "${goal.name}".`,
                        category: 'GOAL_UPDATE',
                        channels: ['IN_APP', 'SMS']
                    });
                }
            } else if (transaction.type === 'DEPOSIT') {
                await NotificationService.send({
                    userId: transaction.walletId, // Wallet ID is used as fallback, but service needs userId
                    title: 'Deposit Successful',
                    message: `Your deposit of ${transaction.amount} GHS was successful.`,
                    category: 'TRANSACTION',
                    channels: ['IN_APP', 'SMS']
                });
            } else if (transaction.type === 'GOAL_FUNDING' && transaction.goalId) {
                const goal = await tx.goal.findUnique({ where: { id: transaction.goalId } });
                if (goal) {
                    await NotificationService.send({
                        userId: goal.userId,
                        title: 'Goal Funded via Deposit',
                        message: `Your goal "${goal.name}" has been credited with ${transaction.amount} GHS.`,
                        category: 'GOAL_UPDATE',
                        channels: ['IN_APP']
                    });
                }
            }

            return updatedTransaction;
        });
    }
}
