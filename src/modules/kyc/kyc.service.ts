import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';
import { KYCStatus } from '@prisma/client';
import { encrypt, decrypt } from '../../shared/utils/encryption.util.js';

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
                idNumber: encrypt(data.idNumber),
                idImageUrl: data.idImageUrl,
                selfieImageUrl: data.selfieImageUrl,
                selfieVerified: false, // Reset selfie verification on resubmission
                selfieMatchScore: null,
                selfieReviewNote: null,
                bankName: data.bankName,
                bankAccountNo: data.bankAccountNo,
                bankAccountName: data.bankAccountName,
                kycStatus: KYCStatus.PENDING,
                kycNote: null // Reset note on re-submission
            }
        });
    }

    /**
     * Submit or resubmit selfie only
     */
    static async submitSelfie(userId: string, selfieImageUrl: string) {
        const profile = await prisma.profile.findFirst({
            where: { userId }
        });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'User profile not found');
        }

        if (profile.kycStatus === KYCStatus.VERIFIED && profile.selfieVerified) {
            throw new ApiException(400, 'ALREADY_VERIFIED', 'Your selfie is already verified');
        }

        return prisma.profile.update({
            where: { id: profile.id },
            data: {
                selfieImageUrl,
                selfieVerified: false,
                selfieMatchScore: null,
                selfieReviewNote: null,
                // If KYC was failed due to selfie, reset to PENDING
                ...(profile.kycStatus === KYCStatus.FAILED ? { kycStatus: KYCStatus.PENDING, kycNote: 'Selfie resubmitted' } : {})
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
                selfieVerified: true,
                selfieMatchScore: true,
                selfieReviewNote: true,
                bankName: true,
                bankAccountNo: true,
                bankAccountName: true,
                updatedAt: true
            }
        });

        if (!profile) {
            throw new ApiException(404, 'NOT_FOUND', 'User profile not found');
        }

        // Decrypt ID Number if present
        if (profile.idNumber) {
            try {
                profile.idNumber = decrypt(profile.idNumber);
            } catch (err) {
                console.error('❌ Failed to decrypt ID Number:', err);
                profile.idNumber = '[ENCRYPTION_ERROR]';
            }
        }

        return profile;
    }
}
