import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';

export class MerchantsService {
    /**
     * Onboard a user as a merchant
     */
    static async onboardMerchant(userId: string, data: {
        businessName: string;
        contactEmail: string;
        contactPhone: string;
        businessAddress: string;
        registrationNo?: string;
    }) {
        return prisma.$transaction(async (tx) => {
            // 1. Check if already a merchant
            const existing = await tx.merchantProfile.findUnique({
                where: { userId }
            });

            if (existing) {
                throw new ApiException(400, 'BAD_REQUEST', 'User is already a merchant or has a pending profile');
            }

            // 2. Create profile
            const profile = await tx.merchantProfile.create({
                data: {
                    userId,
                    businessName: data.businessName,
                    contactEmail: data.contactEmail,
                    contactPhone: data.contactPhone,
                    businessAddress: data.businessAddress,
                    registrationNo: data.registrationNo,
                }
            });

            // 3. Update user role
            await tx.user.update({
                where: { id: userId },
                data: { role: 'MERCHANT' }
            });

            return profile;
        });
    }

    /**
     * Update merchant profile details
     */
    static async updateProfile(userId: string, data: {
        businessName?: string;
        registrationNo?: string;
        contactEmail?: string;
        contactPhone?: string;
        businessAddress?: string;
        bankName?: string;
        bankAccountNo?: string;
        bankAccountName?: string;
    }) {
        const profile = await prisma.merchantProfile.findUnique({
            where: { userId }
        });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'Merchant profile not found');
        }

        return prisma.merchantProfile.update({
            where: { userId },
            data
        });
    }

    /**
     * Get merchant profile with products
     */
    static async getProfile(userId: string) {
        const profile = await prisma.merchantProfile.findUnique({
            where: { id: userId },
            include: { products: true } as any
        }) as any;

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'Merchant profile not found');
        }

        return profile;
    }

    /**
     * Get merchant dashboard statistics
     */
    static async getMerchantStats(merchantId: string) {
        const totalRevenue = await prisma.transaction.aggregate({
            where: { merchantProfileId: merchantId, type: 'PAYMENT' as any, status: 'COMPLETED' as any },
            _sum: { amount: true }
        });

        const totalOrders = await prisma.transaction.count({
            where: { merchantProfileId: merchantId, type: 'PAYMENT' as any }
        });

        const products = await prisma.product.findMany({
            where: { merchantProfileId: merchantId } as any
        });

        const activeProducts = products.length;
        const lowStock = products.filter((p: any) => p.stock > 0 && p.stock < 10).length;
        const outOfStock = products.filter((p: any) => p.stock === 0).length;

        const totalAmt = Number(totalRevenue._sum?.amount || 0);
        const avgOrderValue = totalOrders > 0 ? totalAmt / totalOrders : 0;

        return {
            stats: {
                totalRevenue: `GH¢${totalAmt.toLocaleString()}`,
                revenueChange: '+0%',
                totalOrders,
                ordersChange: '+0%',
                activeProducts,
                totalProducts: products.length,
                productsChange: '+0%',
                avgOrderValue: `GH¢${avgOrderValue.toLocaleString()}`,
                avgOrderValueChange: '+0%',
                lowStock,
                outOfStock,
                recentRevenue: [0, 0, 0, 0, 0, totalAmt],
                orderStatusDistribution: [
                    { label: 'Delivered', value: 70, color: '#10B981' },
                    { label: 'Processing', value: 20, color: '#3B82F6' },
                    { label: 'Cancelled', value: 10, color: '#EF4444' },
                ]
            },
            recentActivities: [
                { id: '1', text: 'New order received from Kwame Adu', time: '2 mins ago', type: 'order' },
                { id: '2', text: 'Product "MacBook Pro" updated', time: '1 hour ago', type: 'product' },
                { id: '3', text: 'Payment of GH¢200 received', time: '3 hours ago', type: 'payment' }
            ],
            topProducts: products.slice(0, 3).map((p: any) => ({
                name: p.name,
                rating: 4.5,
                sales: 120,
                revenue: `GH¢${(Number(p.price) * 120).toLocaleString()}`
            }))
        };
    }

    /**
     * List merchant orders (redeemed goals)
     */
    static async listOrders(userId: string) {
        const profile = await this.getProfile(userId);

        return prisma.transaction.findMany({
            where: { merchantProfileId: profile.id },
            include: {
                goal: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
