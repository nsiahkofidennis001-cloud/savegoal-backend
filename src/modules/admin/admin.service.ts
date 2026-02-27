import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';
import { NotificationService } from '../notifications/notification.service.js';
import { AuditService } from '../../shared/services/audit.service.js';
import { decrypt } from '../../shared/utils/encryption.util.js';

export class AdminService {
    // ==================== DASHBOARD ====================

    /**
     * Get enhanced dashboard statistics
     */
    static async getDashboardStats() {
        const [
            userCount,
            merchantCount,
            activeGoals,
            completedGoals,
            totalSaved,
            totalTransactions,
            pendingKyc,
            verifiedKyc,
            failedKyc,
            pendingPayouts,
            walletBalance,
            recentUsers,
            recentTransactions
        ] = await Promise.all([
            prisma.user.count(),
            prisma.merchantProfile.count(),
            prisma.goal.count({ where: { status: 'ACTIVE' } }),
            prisma.goal.count({ where: { status: 'COMPLETED' } }),
            prisma.goal.aggregate({ _sum: { currentAmount: true } }),
            prisma.transaction.count(),
            prisma.profile.count({ where: { kycStatus: 'PENDING', idNumber: { not: null } } }),
            prisma.profile.count({ where: { kycStatus: 'VERIFIED' } }),
            prisma.profile.count({ where: { kycStatus: 'FAILED' } }),
            prisma.transaction.count({ where: { status: 'PENDING', type: 'MERCHANT_PAYOUT' } }),
            prisma.wallet.aggregate({ _sum: { balance: true } }),
            // Users created in last 7 days
            prisma.user.count({
                where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
            }),
            // Transactions in last 7 days
            prisma.transaction.count({
                where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
            })
        ]);

        // Revenue trend: last 7 days deposits
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const dailyDeposits = await prisma.transaction.groupBy({
            by: ['createdAt'],
            where: {
                type: 'DEPOSIT',
                status: 'COMPLETED',
                createdAt: { gte: sevenDaysAgo }
            },
            _sum: { amount: true },
            _count: true
        });

        // User growth: last 7 days
        const dailyUsers = await prisma.user.groupBy({
            by: ['createdAt'],
            where: { createdAt: { gte: sevenDaysAgo } },
            _count: true
        });

        return {
            overview: {
                totalUsers: userCount,
                totalMerchants: merchantCount,
                activeGoals,
                completedGoals,
                totalSavedGHS: totalSaved._sum.currentAmount || 0,
                totalTransactions,
                totalWalletBalanceGHS: walletBalance._sum.balance || 0,
                pendingPayouts
            },
            kyc: {
                pending: pendingKyc,
                verified: verifiedKyc,
                failed: failedKyc,
                total: pendingKyc + verifiedKyc + failedKyc
            },
            trends: {
                newUsersLast7Days: recentUsers,
                transactionsLast7Days: recentTransactions,
                dailyDeposits: dailyDeposits.map(d => ({
                    date: d.createdAt,
                    amount: d._sum.amount,
                    count: d._count
                })),
                dailyUsers: dailyUsers.map(d => ({
                    date: d.createdAt,
                    count: d._count
                }))
            }
        };
    }

    /**
     * Get basic system stats (legacy)
     */
    static async getSystemStats() {
        const stats = await this.getDashboardStats();
        return {
            users: stats.overview.totalUsers,
            merchants: stats.overview.totalMerchants,
            activeGoals: stats.overview.activeGoals,
            totalSavedGHS: stats.overview.totalSavedGHS,
            totalTransactions: stats.overview.totalTransactions
        };
    }

    // ==================== USER MANAGEMENT ====================

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
     * Search users by name, email, or phone with filters
     */
    static async searchUsers(query: string, filters?: {
        role?: string;
        kycStatus?: string;
        page?: number;
        limit?: number;
    }) {
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};

        // Text search
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query } }
            ];
        }

        // Role filter
        if (filters?.role && ['CONSUMER', 'MERCHANT', 'ADMIN'].includes(filters.role)) {
            where.role = filters.role;
        }

        // KYC status filter
        if (filters?.kycStatus) {
            where.profile = {
                kycStatus: filters.kycStatus
            };
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                include: {
                    profile: {
                        select: {
                            firstName: true,
                            lastName: true,
                            kycStatus: true,
                            profilePic: true
                        }
                    },
                    wallet: {
                        select: { balance: true, currency: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
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
     * Get detailed user profile for admin view
     */
    static async getUserDetail(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                wallet: true,
                goals: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                sessions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        createdAt: true,
                        expiresAt: true,
                        ipAddress: true,
                        userAgent: true
                    }
                },
                notifications: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        if (!user) {
            throw new ApiException(404, 'NOT_FOUND', 'User not found');
        }

        // Get user's transactions via wallet
        let transactions: any[] = [];
        if (user.wallet) {
            transactions = await prisma.transaction.findMany({
                where: { walletId: user.wallet.id },
                orderBy: { createdAt: 'desc' },
                take: 20
            });
        }

        // Decrypt ID Number if present in profile
        if (user.profile?.idNumber) {
            try {
                user.profile.idNumber = decrypt(user.profile.idNumber);
            } catch (err) {
                console.error('❌ Failed to decrypt ID Number for admin:', err);
                user.profile.idNumber = '[ENCRYPTION_ERROR]';
            }
        }

        return { ...user, transactions };
    }

    /**
     * Suspend or unsuspend a user by toggling their role
     */
    static async toggleUserSuspension(userId: string, suspend: boolean) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new ApiException(404, 'NOT_FOUND', 'User not found');
        }

        if (user.role === 'ADMIN') {
            throw new ApiException(403, 'FORBIDDEN', 'Cannot suspend admin users');
        }

        // Delete all active sessions to force logout
        if (suspend) {
            await prisma.session.deleteMany({
                where: { userId }
            });
        }

        // We use emailVerified as a suspension flag (false = suspended)
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { emailVerified: !suspend }
        });

        // Notify user
        await NotificationService.send({
            userId,
            title: suspend ? 'Account Suspended' : 'Account Reinstated',
            message: suspend
                ? 'Your SaveGoal account has been suspended. Contact support for more information.'
                : 'Your SaveGoal account has been reinstated. You can now log in and use all features.',
            category: 'SECURITY',
            channels: ['IN_APP']
        });

        return updated;
    }

    // ==================== MERCHANT MANAGEMENT ====================

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
                },
                _count: {
                    select: { products: true, transactions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Verify or reject a merchant
     */
    static async verifyMerchant(merchantId: string, isVerified: boolean) {
        const merchant = await prisma.merchantProfile.findUnique({
            where: { id: merchantId },
            include: { user: true }
        });

        if (!merchant) {
            throw new ApiException(404, 'NOT_FOUND', 'Merchant profile not found');
        }

        const updated = await prisma.merchantProfile.update({
            where: { id: merchantId },
            data: { isVerified }
        });

        // Notify merchant
        await NotificationService.send({
            userId: merchant.userId,
            title: isVerified ? 'Merchant Verified' : 'Merchant Verification Failed',
            message: isVerified
                ? 'Your merchant account has been verified. You can now list products and receive payments.'
                : 'Your merchant verification was declined. Please update your details and resubmit.',
            category: 'SECURITY',
            channels: ['IN_APP', 'WHATSAPP']
        });

        return updated;
    }

    // ==================== KYC MANAGEMENT ====================

    /**
     * List all pending KYC submissions
     */
    static async listPendingKyc() {
        return prisma.profile.findMany({
            where: {
                kycStatus: 'PENDING',
                idNumber: { not: null } // Only show those who actually submitted
            },
            include: {
                user: {
                    select: { name: true, email: true, phone: true, createdAt: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    /**
     * List all KYC submissions with optional status filter
     */
    static async listAllKyc(status?: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where: any = { idNumber: { not: null } };

        if (status && ['PENDING', 'VERIFIED', 'FAILED', 'EXPIRED'].includes(status)) {
            where.kycStatus = status;
        }

        const [profiles, total] = await Promise.all([
            prisma.profile.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: { name: true, email: true, phone: true, createdAt: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.profile.count({ where })
        ]);

        return {
            profiles,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    /**
     * Get detailed KYC submission for review (includes image URLs)
     */
    static async getKycDetail(userId: string) {
        const profile = await prisma.profile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        createdAt: true,
                        image: true
                    }
                }
            }
        });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'User profile not found');
        }

        if (profile.idNumber) {
            try {
                profile.idNumber = decrypt(profile.idNumber);
            } catch (err) {
                console.error('❌ Failed to decrypt ID Number for admin (KYC):', err);
                profile.idNumber = '[ENCRYPTION_ERROR]';
            }
        }

        return profile;
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

        const updated = await prisma.profile.update({
            where: { userId },
            data: {
                kycStatus: status,
                kycNote: note,
                kycVerifiedAt: status === 'VERIFIED' ? new Date() : null,
                // If approving KYC and selfie was submitted, mark selfie verified too
                ...(status === 'VERIFIED' && profile.selfieImageUrl ? { selfieVerified: true } : {})
            }
        });

        // Audit Log
        await AuditService.record({
            action: status === 'VERIFIED' ? 'KYC_VERIFIED' : 'KYC_REJECTED',
            entityType: 'USER_PROFILE',
            entityId: profile.id,
            oldValue: { status: profile.kycStatus },
            newValue: { status, note }
        });

        // Notify user
        await NotificationService.send({
            userId,
            title: status === 'VERIFIED' ? 'KYC Verified' : 'KYC Verification Failed',
            message: status === 'VERIFIED'
                ? 'Your identity has been verified! You now have full access to all SaveGoal features.'
                : `Your KYC verification failed. ${note ? `Reason: ${note}` : 'Please resubmit your documents.'}`,
            category: 'SECURITY',
            channels: ['IN_APP', 'WHATSAPP']
        });

        return updated;
    }

    /**
     * Review selfie specifically (approve/reject)
     */
    static async reviewSelfie(userId: string, verified: boolean, matchScore?: number, note?: string) {
        const profile = await prisma.profile.findUnique({
            where: { userId }
        });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'User profile not found');
        }

        if (!profile.selfieImageUrl) {
            throw new ApiException(400, 'BAD_REQUEST', 'No selfie submitted for this user');
        }

        const updated = await prisma.profile.update({
            where: { userId },
            data: {
                selfieVerified: verified,
                selfieMatchScore: matchScore,
                selfieReviewNote: note
            }
        });

        // Notify user
        await NotificationService.send({
            userId,
            title: verified ? 'Selfie Verified' : 'Selfie Verification Failed',
            message: verified
                ? 'Your selfie has been verified successfully.'
                : `Your selfie verification failed. ${note ? `Reason: ${note}` : 'Please resubmit a clearer selfie.'}`,
            category: 'SECURITY',
            channels: ['IN_APP']
        });

        return updated;
    }

    // ==================== PAYOUTS ====================

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

            if (status === 'FAILED' && transaction.merchantProfileId) {
                await tx.merchantProfile.update({
                    where: { id: transaction.merchantProfileId },
                    data: { balance: { increment: transaction.amount } }
                });
            }

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

    // ==================== TRANSACTIONS ====================

    /**
     * Get global transaction history with filters
     */
    static async getGlobalTransactions(page = 1, limit = 50, filters?: {
        type?: string;
        status?: string;
    }) {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (filters?.type) where.type = filters.type;
        if (filters?.status) where.status = filters.status;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                include: {
                    wallet: {
                        include: {
                            user: {
                                select: { name: true, email: true }
                            }
                        }
                    },
                    goal: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.transaction.count({ where })
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

    // ==================== ACTIVITY FEED ====================

    /**
     * Get recent system activity
     */
    static async getRecentActivity(limit = 30) {
        const [recentUsers, recentTransactions, recentKyc] = await Promise.all([
            prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true
                }
            }),
            prisma.transaction.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                    wallet: {
                        include: {
                            user: { select: { name: true } }
                        }
                    }
                }
            }),
            prisma.profile.findMany({
                where: { idNumber: { not: null } },
                orderBy: { updatedAt: 'desc' },
                take: limit,
                select: {
                    userId: true,
                    kycStatus: true,
                    updatedAt: true,
                    user: { select: { name: true, email: true } }
                }
            })
        ]);

        // Merge and sort all activities by date
        const activities: any[] = [];

        recentUsers.forEach(u => {
            activities.push({
                type: 'USER_JOINED',
                message: `${u.name} joined as ${u.role}`,
                user: u.name,
                email: u.email,
                timestamp: u.createdAt
            });
        });

        recentTransactions.forEach(t => {
            activities.push({
                type: 'TRANSACTION',
                message: `${t.type} of ${t.amount} GHS (${t.status})`,
                user: t.wallet?.user?.name || 'Unknown',
                amount: t.amount,
                transactionType: t.type,
                status: t.status,
                timestamp: t.createdAt
            });
        });

        recentKyc.forEach(k => {
            activities.push({
                type: 'KYC_UPDATE',
                message: `KYC ${k.kycStatus} for ${k.user.name}`,
                user: k.user.name,
                email: k.user.email,
                kycStatus: k.kycStatus,
                timestamp: k.updatedAt
            });
        });

        // Sort by timestamp descending
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return activities.slice(0, limit);
    }

    /**
     * Update a user's role (promote/demote)
     */
    static async updateUserRole(userId: string, role: string) {
        if (!['CONSUMER', 'MERCHANT', 'ADMIN'].includes(role)) {
            throw new ApiException(400, 'BAD_REQUEST', 'Invalid role. Must be CONSUMER, MERCHANT, or ADMIN');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new ApiException(404, 'NOT_FOUND', 'User not found');
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { role: role as any }
        });

        // Audit Log
        await AuditService.record({
            action: 'ROLE_CHANGED',
            entityType: 'USER',
            entityId: userId,
            oldValue: { role: user.role },
            newValue: { role }
        });

        // Notify user of role change
        await NotificationService.send({
            userId,
            title: 'Account Role Updated',
            message: `Your account role has been updated to ${role}.`,
            category: 'SECURITY',
            channels: ['IN_APP']
        });

        return updated;
    }
}
