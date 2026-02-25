import { Router } from 'express';
import { MerchantsService } from './merchants.service.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /merchants/onboard:
 *   post:
 *     summary: Onboard as a merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [businessName, contactEmail, contactPhone, businessAddress]
 *             properties:
 *               businessName:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               businessAddress:
 *                 type: string
 *               registrationNo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Merchant profile created
 */
router.post('/onboard', requireAuth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        const profile = await MerchantsService.onboardMerchant(req.user.id, req.body);
        res.status(201).json({ status: 'success', data: profile });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /merchants/profile:
 *   get:
 *     summary: Get merchant profile
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Merchant profile data
 */
router.get('/profile', requireAuth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        const profile = await MerchantsService.getProfile(req.user.id);
        res.json({ status: 'success', data: profile });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /merchants/profile:
 *   patch:
 *     summary: Update merchant profile
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               businessAddress:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/profile', requireAuth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        const profile = await MerchantsService.updateProfile(req.user.id, req.body);
        res.json({ status: 'success', data: profile });
    } catch (error) {
        next(error);
    }
});

export default router;
