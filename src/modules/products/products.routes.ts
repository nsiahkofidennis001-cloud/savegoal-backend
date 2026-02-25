import { Router } from 'express';
import { ProductsService } from './products.service.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List all available products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', async (req, res, next) => {
    try {
        const products = await ProductsService.listProducts();
        res.json({ status: 'success', data: products });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product details
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 */
router.get('/:id', async (req, res, next) => {
    try {
        const product = await ProductsService.getProduct(req.params.id);
        res.json({ status: 'success', data: product });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a product (Merchants only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               image:
 *                 type: string
 *               stock:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Product created
 */
router.post('/', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        const product = await ProductsService.createProduct(req.user.id, req.body);
        res.status(201).json({ status: 'success', data: product });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     summary: Update a product (Merchant owner only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Product updated
 */
router.patch('/:id', requireAuth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        const product = await ProductsService.updateProduct(req.user.id, req.params.id, req.body);
        res.json({ status: 'success', data: product });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product (Merchant owner only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        await ProductsService.deleteProduct(req.user.id, req.params.id);
        res.json({ status: 'success', message: 'Product deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
