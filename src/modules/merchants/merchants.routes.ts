import { Router } from 'express';
import { MerchantsService } from './merchants.service.js';
import { ProductsService } from '../products/products.service.js';
import { PayoutService } from '../wallet/payout.service.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { success } from '../../shared/utils/response.util.js';

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
router.post('/onboard', requireAuth, async (req: any, res, next) => {
    try {
        const profile = await MerchantsService.onboardMerchant(req.user.id, req.body);
        success(res, profile, undefined, 201);
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
router.get('/profile', requireAuth, async (req: any, res, next) => {
    try {
        const profile = await MerchantsService.getProfile(req.user.id);
        success(res, profile);
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
router.patch('/profile', requireAuth, async (req: any, res, next) => {
    try {
        const profile = await MerchantsService.updateProfile(req.user.id, req.body);
        success(res, profile);
    } catch (error) {
        next(error);
    }
});

router.get('/dashboard', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const dashboard = await MerchantsService.getDashboard(req.user.id);
        success(res, dashboard);
    } catch (error) {
        next(error);
    }
});

router.get('/products', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const products = await ProductsService.listMerchantProducts(req.user.id);
        success(res, products);
    } catch (error) {
        next(error);
    }
});

router.get('/products/:id', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const product = await ProductsService.getMerchantProduct(req.user.id, req.params.id);
        success(res, product);
    } catch (error) {
        next(error);
    }
});

router.post('/products', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const product = await ProductsService.createProduct(req.user.id, req.body);
        success(res, product, undefined, 201);
    } catch (error) {
        next(error);
    }
});

router.patch('/products/:id', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const product = await ProductsService.updateProduct(req.user.id, req.params.id, req.body);
        success(res, product);
    } catch (error) {
        next(error);
    }
});

router.delete('/products/:id', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        await ProductsService.deleteProduct(req.user.id, req.params.id);
        success(res, { message: 'Product deleted successfully' });
    } catch (error) {
        next(error);
    }
});

router.get('/orders', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const orders = await MerchantsService.listOrders(req.user.id);
        success(res, orders);
    } catch (error) {
        next(error);
    }
});

router.get('/orders/:id', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const order = await MerchantsService.getOrder(req.user.id, req.params.id);
        success(res, order);
    } catch (error) {
        next(error);
    }
});

router.get('/payouts', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const payouts = await MerchantsService.listPayouts(req.user.id);
        success(res, payouts);
    } catch (error) {
        next(error);
    }
});

router.post('/payouts', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const payout = await PayoutService.requestMerchantPayout(req.user.id, req.body.amount);
        success(res, payout, undefined, 201);
    } catch (error) {
        next(error);
    }
});

router.get('/transactions', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const transactions = await MerchantsService.listTransactions(req.user.id);
        success(res, transactions);
    } catch (error) {
        next(error);
    }
});

export default router;
