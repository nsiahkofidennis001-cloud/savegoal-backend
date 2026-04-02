import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';

type MerchantProfileUpdateInput = {
    businessName?: string;
    ownerName?: string;
    registrationNo?: string;
    contactEmail?: string;
    contactPhone?: string;
    businessAddress?: string;
    bankName?: string;
    bankAccountNo?: string;
    bankAccountName?: string;
};

type MetadataRecord = Record<string, unknown>;

function toNumber(value: unknown): number {
    if (value === null || value === undefined) {
        return 0;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function asRecord(value: unknown): MetadataRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    return value as MetadataRecord;
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function formatMonthLabel(date: Date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
    });
}

function formatRelativeTime(input: Date) {
    const elapsed = Date.now() - input.getTime();
    const minutes = Math.max(1, Math.floor(elapsed / (1000 * 60)));

    if (minutes < 60) {
        return `${minutes} min ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hr ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

export class MerchantsService {
    private static async getMerchantByUserId(userId: string) {
        const merchant = await prisma.merchantProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
            },
        });

        if (!merchant) {
            throw new ApiException(404, 'NOT_FOUND', 'Merchant profile not found');
        }

        return merchant;
    }

    private static mapMerchantOrder(transaction: {
        id: string;
        amount: unknown;
        currency: string;
        status: string;
        reference: string | null;
        createdAt: Date;
        metadata: unknown;
        goal: {
            id: string;
            user: {
                name: string;
                email: string;
                phone: string | null;
                profile: { address: string | null } | null;
            };
            product: {
                id: string;
                name: string;
                image: string | null;
            } | null;
        } | null;
    }) {
        const metadata = asRecord(transaction.metadata);
        const amount = toNumber(transaction.amount);
        const productName = asString(metadata.productName, transaction.goal?.product?.name ?? 'Product');
        const productId = asString(metadata.productId, transaction.goal?.product?.id ?? '');

        return {
            id: transaction.id,
            goalId: transaction.goal?.id ?? null,
            productId: productId || null,
            productName,
            customerName: asString(metadata.customerName, transaction.goal?.user.name ?? 'Customer'),
            customerEmail: asString(metadata.customerEmail, transaction.goal?.user.email ?? ''),
            customerPhone: asString(metadata.customerPhone, transaction.goal?.user.phone ?? ''),
            shippingAddress: asString(metadata.shippingAddress, transaction.goal?.user.profile?.address ?? ''),
            amount,
            currency: transaction.currency,
            paymentStatus: transaction.status === 'COMPLETED' ? 'PAID' : transaction.status,
            orderStatus: asString(metadata.orderStatus, 'PROCESSING'),
            reference: transaction.reference,
            createdAt: transaction.createdAt,
            items: [{
                id: productId || transaction.id,
                name: productName,
                quantity: 1,
                unitPrice: amount,
                image: transaction.goal?.product?.image ?? null,
            }],
        };
    }

    private static mapPayout(transaction: {
        id: string;
        amount: unknown;
        currency: string;
        status: string;
        reference: string | null;
        createdAt: Date;
        metadata: unknown;
    }) {
        const metadata = asRecord(transaction.metadata);

        return {
            id: transaction.id,
            amount: toNumber(transaction.amount),
            currency: transaction.currency,
            status: transaction.status,
            reference: transaction.reference,
            requestedAt: transaction.createdAt,
            processedAt: typeof metadata.processedAt === 'string' ? metadata.processedAt : null,
            adminNote: typeof metadata.adminNote === 'string' ? metadata.adminNote : null,
            bankName: typeof metadata.bankName === 'string' ? metadata.bankName : null,
            bankAccountNo: typeof metadata.accountNo === 'string' ? metadata.accountNo : null,
            bankAccountName: typeof metadata.accountName === 'string' ? metadata.accountName : null,
        };
    }

    /**
     * Onboard a user as a merchant.
     */
    static async onboardMerchant(userId: string, data: {
        businessName: string;
        contactEmail: string;
        contactPhone: string;
        businessAddress: string;
        registrationNo?: string;
    }) {
        return prisma.$transaction(async (tx) => {
            const existingMerchant = await tx.merchantProfile.findUnique({
                where: { userId },
            });

            if (existingMerchant) {
                throw new ApiException(400, 'BAD_REQUEST', 'User is already a merchant or has a pending profile');
            }

            const existingProfile = await tx.profile.findUnique({
                where: { userId },
            });

            if (!existingProfile) {
                const user = await tx.user.findUnique({ where: { id: userId } });
                const nameParts = user?.name.split(' ') || ['User'];

                await tx.profile.create({
                    data: {
                        userId,
                        firstName: nameParts[0],
                        lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'SaveGoal',
                        kycStatus: 'PENDING',
                    },
                });
            }

            const profile = await tx.merchantProfile.create({
                data: {
                    userId,
                    businessName: data.businessName,
                    contactEmail: data.contactEmail,
                    contactPhone: data.contactPhone,
                    businessAddress: data.businessAddress,
                    registrationNo: data.registrationNo,
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { role: 'MERCHANT' },
            });

            return profile;
        });
    }

    /**
     * Update merchant profile details.
     */
    static async updateProfile(userId: string, data: MerchantProfileUpdateInput) {
        const merchant = await this.getMerchantByUserId(userId);

        return prisma.$transaction(async (tx) => {
            if (data.ownerName) {
                await tx.user.update({
                    where: { id: merchant.userId },
                    data: { name: data.ownerName },
                });
            }

            await tx.merchantProfile.update({
                where: { userId },
                data: {
                    businessName: data.businessName,
                    registrationNo: data.registrationNo,
                    contactEmail: data.contactEmail,
                    contactPhone: data.contactPhone,
                    businessAddress: data.businessAddress,
                    bankName: data.bankName,
                    bankAccountNo: data.bankAccountNo,
                    bankAccountName: data.bankAccountName,
                },
            });

            return this.getProfile(userId);
        });
    }

    /**
     * Get merchant profile with summary fields.
     */
    static async getProfile(userId: string) {
        const merchant = await this.getMerchantByUserId(userId);
        const [productsCount, activeProducts] = await Promise.all([
            prisma.product.count({ where: { merchantProfileId: merchant.id } }),
            prisma.product.count({ where: { merchantProfileId: merchant.id, isAvailable: true } }),
        ]);

        return {
            id: merchant.id,
            userId: merchant.userId,
            businessName: merchant.businessName,
            ownerName: merchant.user.name,
            contactEmail: merchant.contactEmail,
            contactPhone: merchant.contactPhone,
            businessAddress: merchant.businessAddress,
            registrationNo: merchant.registrationNo,
            bankName: merchant.bankName,
            bankAccountNo: merchant.bankAccountNo,
            bankAccountName: merchant.bankAccountName,
            isVerified: merchant.isVerified,
            balance: toNumber(merchant.balance),
            kycStatus: merchant.user.profile?.kycStatus ?? 'PENDING',
            kycNote: merchant.user.profile?.kycNote ?? null,
            productsCount,
            activeProducts,
            createdAt: merchant.createdAt,
            updatedAt: merchant.updatedAt,
        };
    }

    /**
     * Build the merchant dashboard from real product and redemption data.
     */
    static async getDashboard(userId: string) {
        const merchant = await this.getMerchantByUserId(userId);

        const [products, saleTransactions, payoutTransactions] = await Promise.all([
            prisma.product.findMany({
                where: { merchantProfileId: merchant.id },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.transaction.findMany({
                where: {
                    merchantProfileId: merchant.id,
                    goalId: { not: null },
                },
                include: {
                    goal: {
                        include: {
                            user: {
                                include: {
                                    profile: true,
                                },
                            },
                            product: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.transaction.findMany({
                where: {
                    merchantProfileId: merchant.id,
                    goalId: null,
                    type: 'MERCHANT_PAYOUT',
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const orders = saleTransactions.map((transaction) => this.mapMerchantOrder(transaction));
        const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
        const activeProducts = products.filter((product) => product.isAvailable).length;
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        const pendingPayoutAmount = payoutTransactions
            .filter((transaction) => transaction.status === 'PENDING')
            .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

        const monthBuckets = Array.from({ length: 6 }, (_, index) => {
            const date = new Date();
            date.setDate(1);
            date.setMonth(date.getMonth() - (5 - index));
            return {
                key: `${date.getFullYear()}-${date.getMonth()}`,
                label: formatMonthLabel(date),
                amount: 0,
            };
        });

        for (const order of orders) {
            const date = new Date(order.createdAt);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            const bucket = monthBuckets.find((item) => item.key === key);

            if (bucket) {
                bucket.amount += order.amount;
            }
        }

        const topProductsMap = new Map<string, { name: string; orders: number; revenue: number }>();
        for (const order of orders) {
            const key = order.productId || order.productName;
            const current = topProductsMap.get(key) || {
                name: order.productName,
                orders: 0,
                revenue: 0,
            };

            current.orders += 1;
            current.revenue += order.amount;
            topProductsMap.set(key, current);
        }

        const recentActivity = [
            ...orders.slice(0, 4).map((order) => ({
                id: `order-${order.id}`,
                type: 'order',
                message: `${order.customerName} redeemed ${order.productName}`,
                createdAt: order.createdAt,
                time: formatRelativeTime(new Date(order.createdAt)),
            })),
            ...payoutTransactions.slice(0, 3).map((payout) => ({
                id: `payout-${payout.id}`,
                type: 'payout',
                message: `Payout request ${payout.status.toLowerCase()} for GHS ${toNumber(payout.amount).toLocaleString()}`,
                createdAt: payout.createdAt,
                time: formatRelativeTime(payout.createdAt),
            })),
            ...products.slice(0, 3).map((product) => ({
                id: `product-${product.id}`,
                type: 'product',
                message: `Product added: ${product.name}`,
                createdAt: product.createdAt,
                time: formatRelativeTime(product.createdAt),
            })),
        ]
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
            .slice(0, 6);

        return {
            summary: {
                availableBalance: toNumber(merchant.balance),
                totalRevenue,
                totalOrders: orders.length,
                activeProducts,
                avgOrderValue,
                pendingPayoutAmount,
                pendingPayouts: payoutTransactions.filter((transaction) => transaction.status === 'PENDING').length,
            },
            monthlyRevenue: monthBuckets.map(({ label, amount }) => ({ label, amount })),
            latestOrders: orders.slice(0, 5),
            topProducts: Array.from(topProductsMap.values())
                .sort((left, right) => right.revenue - left.revenue)
                .slice(0, 5),
            recentActivity,
        };
    }

    /**
     * List merchant redemption-backed orders.
     */
    static async listOrders(userId: string) {
        const merchant = await this.getMerchantByUserId(userId);
        const transactions = await prisma.transaction.findMany({
            where: {
                merchantProfileId: merchant.id,
                goalId: { not: null },
            },
            include: {
                goal: {
                    include: {
                        user: {
                            include: {
                                profile: true,
                            },
                        },
                        product: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const orders = transactions.map((transaction) => this.mapMerchantOrder(transaction));

        return {
            items: orders,
            stats: {
                totalOrders: orders.length,
                processing: orders.filter((order) => order.orderStatus === 'PROCESSING').length,
                fulfilled: orders.filter((order) => order.orderStatus === 'FULFILLED').length,
                cancelled: orders.filter((order) => order.orderStatus === 'CANCELLED').length,
            },
        };
    }

    /**
     * Get a single merchant order.
     */
    static async getOrder(userId: string, orderId: string) {
        const merchant = await this.getMerchantByUserId(userId);
        const transaction = await prisma.transaction.findFirst({
            where: {
                id: orderId,
                merchantProfileId: merchant.id,
                goalId: { not: null },
            },
            include: {
                goal: {
                    include: {
                        user: {
                            include: {
                                profile: true,
                            },
                        },
                        product: true,
                    },
                },
            },
        });

        if (!transaction) {
            throw new ApiException(404, 'NOT_FOUND', 'Merchant order not found');
        }

        return this.mapMerchantOrder(transaction);
    }

    /**
     * List merchant payout requests.
     */
    static async listPayouts(userId: string) {
        const merchant = await this.getMerchantByUserId(userId);
        const transactions = await prisma.transaction.findMany({
            where: {
                merchantProfileId: merchant.id,
                goalId: null,
                type: 'MERCHANT_PAYOUT',
            },
            orderBy: { createdAt: 'desc' },
        });

        return {
            summary: {
                currentBalance: toNumber(merchant.balance),
                availableForPayout: toNumber(merchant.balance),
                pendingPayoutAmount: transactions
                    .filter((transaction) => transaction.status === 'PENDING')
                    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0),
            },
            items: transactions.map((transaction) => this.mapPayout(transaction)),
        };
    }

    /**
     * List merchant-facing financial activity for the payments screen.
     */
    static async listTransactions(userId: string) {
        const merchant = await this.getMerchantByUserId(userId);
        const transactions = await prisma.transaction.findMany({
            where: {
                merchantProfileId: merchant.id,
            },
            include: {
                goal: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const items = transactions.map((transaction) => {
            const metadata = asRecord(transaction.metadata);
            const isMerchantOrder = transaction.goalId !== null;
            const amount = toNumber(transaction.amount);
            const productName = asString(metadata.productName, transaction.goal?.product?.name ?? 'Goal redemption');

            return {
                id: transaction.id,
                type: isMerchantOrder ? 'SALE' : 'PAYOUT',
                direction: isMerchantOrder ? 'credit' : 'debit',
                amount,
                currency: transaction.currency,
                status: transaction.status,
                reference: transaction.reference,
                description: isMerchantOrder
                    ? `Goal redeemed for ${productName}`
                    : `Payout request to ${asString(metadata.bankName, merchant.bankName ?? 'bank account')}`,
                createdAt: transaction.createdAt,
            };
        });

        return {
            summary: {
                currentBalance: toNumber(merchant.balance),
                availableForPayout: toNumber(merchant.balance),
                totalTransactions: items.length,
            },
            items,
        };
    }
}
