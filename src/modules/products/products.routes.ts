import { Router } from 'express';
import { ProductsService } from './products.service.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';

const router = Router();

/**
 * GET /products
 * List all available products with filters
 */
router.get('/', async (req, res, next) => {
    try {
        const { categoryId, q, minPrice, maxPrice } = req.query;
        const products = await ProductsService.listProducts({
            categoryId: categoryId as string,
            searchTerm: q as string,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
        });
        res.json({ status: 'success', data: products });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /products/categories
 * List all categories
 */
router.get('/categories', async (req, res, next) => {
    try {
        const categories = await ProductsService.listCategories();
        res.json({ status: 'success', data: categories });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /products/categories
 * Create a new category (Admin only)
 */
router.post('/categories', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
    try {
        const category = await ProductsService.createCategory(req.body);
        res.status(201).json({ status: 'success', data: category });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /products/:id
 * Get product details
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
 * POST /products
 * Create a product (Merchants only)
 */
router.post('/', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const product = await ProductsService.createProduct(req.user.id, req.body);
        res.status(201).json({ status: 'success', data: product });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /products/:id/variants
 * Add a variant to a product (Merchant owner only)
 */
router.post('/:id/variants', requireAuth, requireRole('MERCHANT', 'ADMIN'), async (req: any, res, next) => {
    try {
        const variant = await ProductsService.addVariant(req.user.id, req.params.id, req.body);
        res.status(201).json({ status: 'success', data: variant });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /products/:id
 * Update a product (Merchant owner only)
 */
router.patch('/:id', requireAuth, async (req: any, res, next) => {
    try {
        const product = await ProductsService.updateProduct(req.user.id, req.params.id, req.body);
        res.json({ status: 'success', data: product });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /products/:id
 * Delete a product (Merchant owner only)
 */
router.delete('/:id', requireAuth, async (req: any, res, next) => {
    try {
        await ProductsService.deleteProduct(req.user.id, req.params.id);
        res.json({ status: 'success', message: 'Product deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
