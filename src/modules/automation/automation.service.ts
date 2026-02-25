import { prisma } from '../../infra/prisma.client.js';
import { logger } from '../../infra/logger.js';

import { TransactionType } from '@prisma/client';

export class AutomationService {
    /**
     * Process all recurring savings due today
     */
    static async processMonthlySavings() {
        const today = new Date();
        const currentDay = today.getDate();

        // We only support savingsDay 1-28 to avoid February/Month-end issues
        const dayToMatch = currentDay > 28 ? 28 : currentDay;

        // 1. Find all goals due for debit today
        const goals = await prisma.goal.findMany({
            where: {
                isRecurring: true,
                savingsDay: dayToMatch,
                status: 'ACTIVE',
                // Avoid double charging if already charged this month
                OR: [
                    { lastAutoDebitDate: null },
                    {
                        lastAutoDebitDate: {
                            lt: new Date(today.getFullYear(), today.getMonth(), 1)
                        }
                    }
                ]
            },
            include: { user: { include: { wallet: true } } }
        });

        logger.info(`🤖 Found ${goals.length} goals due for monthly automated savings on day ${dayToMatch}`);

        const results = {
            success: 0,
            failed: 0,
            errors: [] as { goalId: string; error: string }[]
        };

        for (const goal of goals) {
            try {
                if (!goal.user.wallet) {
                    throw new Error(`User ${goal.userId} has no wallet`);
                }

                if (!goal.monthlyAmount) {
                    continue; // Should not happen with validation
                }

                const amountToDeduct = Number(goal.monthlyAmount);

                // Process transaction
                await prisma.$transaction(async (tx) => {
                    // Check balance
                    const wallet = await tx.wallet.findUnique({
                        where: { id: goal.user.wallet!.id }
                    });

                    if (!wallet) {
                        throw new Error('Wallet not found during automated debit');
                    }

                    if (wallet.balance.lessThan(amountToDeduct)) {
                        throw new Error('Insufficient wallet balance');
                    }

                    const balanceBefore = wallet.balance;
                    const balanceAfter = balanceBefore.sub(amountToDeduct);

                    // 1. Deduct from wallet
                    await tx.wallet.update({
                        where: { id: wallet.id },
                        data: { balance: { decrement: amountToDeduct } }
                    });

                    // 2. Add to goal
                    const updatedGoal = await tx.goal.update({
                        where: { id: goal.id },
                        data: {
                            currentAmount: { increment: amountToDeduct },
                            lastAutoDebitDate: today
                        }
                    });

                    // 3. Create transaction record with snapshots
                    await tx.transaction.create({
                        data: {
                            walletId: wallet.id,
                            goalId: goal.id,
                            type: TransactionType.AUTOMATED_SAVINGS,
                            amount: amountToDeduct,
                            status: 'COMPLETED',
                            reference: `AUTO-${goal.id}-${today.toISOString().split('T')[0]}`,
                            balanceBefore: balanceBefore,
                            balanceAfter: balanceAfter,
                            metadata: {
                                isAutomated: true,
                                month: today.getMonth() + 1,
                                year: today.getFullYear()
                            }
                        }
                    });

                    // 4. Check if goal reached
                    if (updatedGoal.currentAmount.greaterThanOrEqualTo(updatedGoal.targetAmount)) {
                        await tx.goal.update({
                            where: { id: goal.id },
                            data: { status: 'COMPLETED' }
                        });
                    }
                });

                results.success++;
            } catch (err: unknown) {
                const error = err as Error;
                logger.error(error, `❌ Failed automated saving for goal ${goal.id}:`);
                results.failed++;
                results.errors.push({ goalId: goal.id, error: error.message });
            }
        }

        return results;
    }
}
