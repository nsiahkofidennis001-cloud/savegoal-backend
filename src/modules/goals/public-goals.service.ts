import { prisma } from '../../infra/prisma.client.js';
import { PaystackProvider } from '../payments/providers/paystack.provider.js';

export class PublicGoalsService {
    /**
     * Get specific, non-sensitive details of a goal for the public page
     */
    static async getPublicGoalDetails(goalId: string) {
        const goal = await prisma.goal.findUnique({
            where: { id: goalId },
            include: {
                user: {
                    select: {
                        name: true, // Only expose the name (which might be their name or "SaveGoal User")
                        profile: { select: { firstName: true, lastName: true } }
                    }
                }
            }
        });

        if (!goal) return null;

        return {
            id: goal.id,
            name: goal.name,
            description: goal.description,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            deadline: goal.deadline,
            status: goal.status,
            ownerName: goal.user.profile?.firstName
                ? `${goal.user.profile.firstName} ${goal.user.profile.lastName}`.trim()
                : goal.user.name,
            createdAt: goal.createdAt
        };
    }

    /**
     * Get all completed public contributions for a goal
     */
    static async getGoalContributions(goalId: string) {
        return prisma.goalContribution.findMany({
            where: {
                goalId,
                status: 'COMPLETED'
            },
            select: {
                id: true,
                contributorName: true,
                message: true,
                amount: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Initialize a Paystack transaction for a public contribution
     */
    static async initializeContribution(data: {
        goalId: string;
        amount: number;
        contributorName: string;
        contributorEmail?: string;
        message?: string;
    }) {
        const goal = await prisma.goal.findUnique({ where: { id: data.goalId } });

        if (!goal) throw new Error('Goal not found');
        if (goal.status !== 'ACTIVE') throw new Error('Goal is not active');

        // Create the pending contribution record
        // We use a temporary reference, which we will replace with the Paystack ref
        const tempReference = `CONTRIB_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const contribution = await prisma.goalContribution.create({
            data: {
                goalId: data.goalId,
                contributorName: data.contributorName,
                contributorEmail: data.contributorEmail,
                message: data.message,
                amount: data.amount,
                reference: tempReference,
                status: 'PENDING'
            }
        });

        // Initialize Paystack checkout
        // Using the contributor's email if provided, otherwise a placeholder system email just for the receipt
        const email = data.contributorEmail || `guest_${Date.now()}@savegoal.com`;

        // Use PaystackProvider directly
        const paymentResult = await PaystackProvider.initializeTransaction({
            email,
            amount: Number(data.amount),
            reference: tempReference,
            metadata: {
                type: 'PUBLIC_CONTRIBUTION',
                contributionId: contribution.id,
                goalId: data.goalId,
                contributorName: data.contributorName
            }
        });

        if (!paymentResult || !paymentResult.status) {
            throw new Error('Failed to initialize payment gateway');
        }

        return {
            authorizationUrl: paymentResult.data.authorization_url,
            reference: tempReference
        };
    }
}
