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
            const existingMerchant = await tx.merchantProfile.findUnique({
                where: { userId }
            });

            if (existingMerchant) {
                throw new ApiException(400, 'BAD_REQUEST', 'User is already a merchant or has a pending profile');
            }

            // 2. Ensure Profile exists (for KYC)
            const existingProfile = await tx.profile.findUnique({
                where: { userId }
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
                    }
                });
            }

            // 3. Create merchant profile
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

            // 4. Update user role
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
            where: { userId },
            include: { products: true } as any
        });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'Merchant profile not found');
        }

        return profile;
    }
}
