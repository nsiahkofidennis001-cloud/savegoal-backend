import { Router, Request, Response } from 'express';
import multer from 'multer';
import { KycService } from './kyc.service.js';
import { StorageClient } from '../../infra/storage.client.js';
import { success, error } from '../../shared/utils/response.util.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.use(requireAuth);

/**
 * GET /api/kyc/status
 * Get the current user's KYC status
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const kycStatus = await KycService.getKycStatus(req.user!.id);
        return success(res, kycStatus);
    } catch (err: any) {
        return error(res, 'INTERNAL_ERROR', err.message);
    }
});

/**
 * POST /api/kyc/upload-id
 * Upload Front and Back ID images
 */
router.post('/upload-id', upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 }
]), async (req: Request, res: Response) => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        if (!files?.front) {
            return error(res, 'VALIDATION_ERROR', 'Front ID image is required', 400);
        }

        const userId = req.user!.id;
        const uploadResults: any = {};

        // Upload Front
        const frontResult = await StorageClient.upload({
            path: `kyc/${userId}/id_front_${Date.now()}`,
            file: files.front[0].buffer,
            contentType: files.front[0].mimetype
        });
        uploadResults.idFrontImageUrl = frontResult.url;

        // Upload Back (Optional for some IDs, but supported)
        if (files.back) {
            const backResult = await StorageClient.upload({
                path: `kyc/${userId}/id_back_${Date.now()}`,
                file: files.back[0].buffer,
                contentType: files.back[0].mimetype
            });
            uploadResults.idBackImageUrl = backResult.url;
        }

        await KycService.updateIdImages(userId, uploadResults);

        return success(res, {
            message: 'ID images uploaded successfully',
            urls: uploadResults
        });
    } catch (err: any) {
        console.error('ID upload error:', err);
        return error(res, 'UPLOAD_ERROR', err.message);
    }
});

/**
 * POST /api/kyc/upload-selfie
 * Upload Selfie image
 */
router.post('/upload-selfie', upload.single('selfie'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return error(res, 'VALIDATION_ERROR', 'Selfie image is required', 400);
        }

        const userId = req.user!.id;
        const result = await StorageClient.upload({
            path: `kyc/${userId}/selfie_${Date.now()}`,
            file: req.file.buffer,
            contentType: req.file.mimetype
        });

        await KycService.updateSelfieImage(userId, result.url!);

        return success(res, {
            message: 'Selfie uploaded successfully',
            url: result.url
        });
    } catch (err: any) {
        console.error('Selfie upload error:', err);
        return error(res, 'UPLOAD_ERROR', err.message);
    }
});

/**
 * POST /api/kyc/submit
 * Submit remaining KYC data (ID details and Bank Details)
 */
router.post('/submit', async (req: Request, res: Response) => {
    try {
        const { idType, idNumber, bankName, bankAccountNo, bankAccountName } = req.body;

        if (!idType || !idNumber) {
            return error(res, 'VALIDATION_ERROR', 'ID Type and ID Number are required', 400);
        }

        const result = await KycService.submitKyc(req.user!.id, {
            idType,
            idNumber,
            bankName,
            bankAccountNo,
            bankAccountName
        });

        return success(res, result);
    } catch (err: any) {
        console.error('KYC submission error:', err);
        const code = err.code || 'INTERNAL_ERROR';
        const statusCode = err.statusCode || 500;
        return error(res, code, err.message, statusCode);
    }
});

export default router;
