import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';
import { KYCStatus } from '@prisma/client';

export class KycService {
    /**
     * Update ID images for a user
     */
    static async updateIdImages(userId: string, data: {
        idFrontImageUrl?: string;
        idBackImageUrl?: string;
    }) {
        const profile = await this.getProfile(userId);

        return prisma.profile.update({
            where: { id: profile.id },
            data: {
                idImageUrl: data.idFrontImageUrl, // Map to idImageUrl for backward compat
                idBackImageUrl: data.idBackImageUrl,
                kycStatus: KYCStatus.PENDING,
            }
        });
    }

    /**
     * Update Selfie image for a user
     */
    static async updateSelfieImage(userId: string, selfieImageUrl: string) {
        const profile = await this.getProfile(userId);

        return prisma.profile.update({
            where: { id: profile.id },
            data: {
                selfieImageUrl,
                kycStatus: KYCStatus.PENDING,
            }
        });
    }

    private static async getProfile(userId: string) {
        const profile = await prisma.profile.findFirst({
            where: { userId }
        });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'User profile not found');
        }

        if (profile.kycStatus === KYCStatus.VERIFIED) {
            throw new ApiException(400, 'ALREADY_VERIFIED', 'Your account is already verified');
        }

        return profile;
    }

    /**
     * Submit remaining KYC data (ID details and Bank Details)
     */
    static async submitKyc(userId: string, data: {
        idType: string;
        idNumber: string;
        bankName?: string;
        bankAccountNo?: string;
        bankAccountName?: string;
    }) {
        const profile = await this.getProfile(userId);

        return prisma.profile.update({
            where: { id: profile.id },
            data: {
                idType: data.idType,
                idNumber: data.idNumber,
                bankName: data.bankName,
                bankAccountNo: data.bankAccountNo,
                bankAccountName: data.bankAccountName,
                kycStatus: KYCStatus.PENDING,
                kycNote: null // Reset note on re-submission
            }
        });
    }

    /**
     * Get KYC status for a user
     */
    static async getKycStatus(userId: string) {
        const profile = await prisma.profile.findFirst({
            where: { userId },
            select: {
                kycStatus: true,
                kycNote: true,
                idType: true,
                idNumber: true,
                idImageUrl: true,
                idBackImageUrl: true,
                selfieImageUrl: true,
                bankName: true,
                bankAccountNo: true,
                bankAccountName: true,
                updatedAt: true
            }
        });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'User profile not found');
        }

        return profile;
    }
}
