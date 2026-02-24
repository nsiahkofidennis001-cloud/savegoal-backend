import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';
import { KYCStatus } from '@prisma/client';

export class KycService {
    /**
     * Submit KYC data for a user
     */
    static async submitKyc(userId: string, data: {
        idType: string;
        idNumber: string;
        idImageUrl?: string;
        selfieImageUrl?: string;
        bankName?: string;
        bankAccountNo?: string;
        bankAccountName?: string;
    }) {
        const profile = await prisma.profile.findFirst({
            where: { userId }
        });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'User profile not found');
        }

        // Only allow submission if not already verified
        if (profile.kycStatus === KYCStatus.VERIFIED) {
            throw new ApiException(400, 'ALREADY_VERIFIED', 'Your account is already verified');
        }

        return prisma.profile.update({
            where: { id: profile.id },
            data: {
                idType: data.idType,
                idNumber: data.idNumber,
                idImageUrl: data.idImageUrl,
                selfieImageUrl: data.selfieImageUrl,
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
