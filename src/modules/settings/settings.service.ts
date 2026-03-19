import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';

export class SettingsService {
    /**
     * Get user profile with notification preferences
     */
    static async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                image: true,
                role: true,
                createdAt: true,
                profile: {
                    select: {
                        firstName: true,
                        lastName: true,
                        dateOfBirth: true,
                        address: true,
                        occupation: true,
                        profilePic: true,
                        kycStatus: true,
                        bankName: true,
                        bankAccountNo: true,
                        bankAccountName: true,
                        notifyInApp: true,
                        notifySms: true,
                        notifyWhatsapp: true,
                        notifyEmail: true,
                    }
                }
            }
        });

        if (!user) {
            throw new ApiException(404, 'NOT_FOUND', 'User not found');
        }

        return user;
    }

    /**
     * Update user profile fields
     */
    static async updateProfile(userId: string, data: {
        name?: string;
        phone?: string;
        image?: string;
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
        address?: string;
        occupation?: string;
        profilePic?: string;
    }) {
        // Update User-level fields
        const userUpdates: any = {};
        if (data.name !== undefined) userUpdates.name = data.name;
        if (data.phone !== undefined) userUpdates.phone = data.phone;
        if (data.image !== undefined) userUpdates.image = data.image;

        if (Object.keys(userUpdates).length > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: userUpdates
            });
        }

        // Update Profile-level fields
        const profileUpdates: any = {};
        if (data.firstName !== undefined) profileUpdates.firstName = data.firstName;
        if (data.lastName !== undefined) profileUpdates.lastName = data.lastName;
        if (data.dateOfBirth !== undefined) profileUpdates.dateOfBirth = new Date(data.dateOfBirth);
        if (data.address !== undefined) profileUpdates.address = data.address;
        if (data.occupation !== undefined) profileUpdates.occupation = data.occupation;
        if (data.profilePic !== undefined) profileUpdates.profilePic = data.profilePic;

        if (Object.keys(profileUpdates).length > 0) {
            const profile = await prisma.profile.findUnique({ where: { userId } });
            if (profile) {
                await prisma.profile.update({
                    where: { userId },
                    data: profileUpdates
                });
            }
        }

        return this.getProfile(userId);
    }

    /**
     * Update notification preferences
     */
    static async updateNotificationPreferences(userId: string, prefs: {
        notifyInApp?: boolean;
        notifySms?: boolean;
        notifyWhatsapp?: boolean;
        notifyEmail?: boolean;
    }) {
        const profile = await prisma.profile.findUnique({ where: { userId } });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'User profile not found. Complete your profile setup first.');
        }

        const updates: any = {};
        if (prefs.notifyInApp !== undefined) updates.notifyInApp = prefs.notifyInApp;
        if (prefs.notifySms !== undefined) updates.notifySms = prefs.notifySms;
        if (prefs.notifyWhatsapp !== undefined) updates.notifyWhatsapp = prefs.notifyWhatsapp;
        if (prefs.notifyEmail !== undefined) updates.notifyEmail = prefs.notifyEmail;

        return prisma.profile.update({
            where: { userId },
            data: updates,
            select: {
                notifyInApp: true,
                notifySms: true,
                notifyWhatsapp: true,
                notifyEmail: true,
            }
        });
    }

    /**
     * Delete user account and all associated data
     */
    static async deleteAccount(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new ApiException(404, 'NOT_FOUND', 'User not found');
        }

        if (user.role === 'ADMIN') {
            throw new ApiException(403, 'FORBIDDEN', 'Admin accounts cannot be self-deleted');
        }

        // Cascade delete handles related records (Profile, Wallet, Goals, Sessions, etc.)
        await prisma.user.delete({ where: { id: userId } });

        return { message: 'Account deleted successfully' };
    }

    /**
     * Submit a refund request (customer-side)
     */
    static async requestRefund(userId: string, transactionId: string, reason: string) {
        // Verify the transaction belongs to the user
        const transaction = await prisma.transaction.findFirst({
            where: { id: transactionId },
            include: { wallet: true }
        });

        if (!transaction) {
            throw new ApiException(404, 'NOT_FOUND', 'Transaction not found');
        }

        if (transaction.wallet.userId !== userId) {
            throw new ApiException(403, 'FORBIDDEN', 'This transaction does not belong to you');
        }

        if (transaction.status !== 'COMPLETED') {
            throw new ApiException(400, 'BAD_REQUEST', 'Only completed transactions can be refunded');
        }

        // Check for duplicate refund request
        const existing = await prisma.refundRequest.findFirst({
            where: {
                userId,
                transactionId,
                status: { in: ['PENDING', 'APPROVED'] }
            }
        });

        if (existing) {
            throw new ApiException(400, 'DUPLICATE', 'A refund request already exists for this transaction');
        }

        return prisma.refundRequest.create({
            data: {
                userId,
                transactionId,
                reason,
                amount: transaction.amount,
            }
        });
    }
}
