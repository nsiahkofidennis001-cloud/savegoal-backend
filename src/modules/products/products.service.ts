import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';

export class ProductsService {
    /**
     * Create a new product for a merchant
     */
    static async createProduct(userId: string, data: {
        name: string;
        description?: string;
        price: number;
        currency?: string;
        image?: string;
        stock?: number;
        categoryId?: string;
    }) {
        const merchant = await prisma.merchantProfile.findUnique({
            where: { userId }
        });

        if (!merchant) {
            throw new ApiException(403, 'FORBIDDEN', 'User is not a merchant');
        }

        return prisma.product.create({
            data: {
                merchantProfileId: merchant.id,
                name: data.name,
                description: data.description,
                price: data.price,
                currency: data.currency || 'GHS',
                image: data.image,
                stock: data.stock,
                categoryId: data.categoryId
            }
        });
    }

    /**
     * List all products with filters
     */
    static async listProducts(filters: {
        categoryId?: string;
        searchTerm?: string;
        minPrice?: number;
        maxPrice?: number;
    } = {}) {
        const { categoryId, searchTerm, minPrice, maxPrice } = filters;

        return prisma.product.findMany({
            where: {
                isAvailable: true,
                ...(categoryId && { categoryId }),
                ...(searchTerm && {
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { description: { contains: searchTerm, mode: 'insensitive' } },
                    ]
                }),
                ...(minPrice !== undefined || maxPrice !== undefined) && {
                    price: {
                        ...(minPrice !== undefined && { gte: minPrice }),
                        ...(maxPrice !== undefined && { lte: maxPrice }),
                    }
                }
            },
            include: {
                category: true,
                variants: true,
                merchant: {
                    select: {
                        businessName: true,
                        isVerified: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Categories Management
     */
    static async listCategories() {
        return prisma.productCategory.findMany({
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });
    }

    static async createCategory(data: { name: string; description?: string; image?: string }) {
        return prisma.productCategory.create({ data });
    }

    /**
     * Variants Management
     */
    static async addVariant(userId: string, productId: string, data: {
        name: string;
        value: string;
        sku?: string;
        price?: number;
        stock?: number;
    }) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { merchant: true }
        });

        if (!product || product.merchant.userId !== userId) {
            throw new ApiException(403, 'FORBIDDEN', 'Unauthorized to manage variants for this product');
        }

        return prisma.productVariant.create({
            data: {
                productId,
                name: data.name,
                value: data.value,
                sku: data.sku,
                price: data.price,
                stock: data.stock
            }
        });
    }

    /**
     * Get a single product
     */
    static async getProduct(id: string) {
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                variants: true,
                merchant: {
                    select: {
                        businessName: true,
                        isVerified: true
                    }
                }
            }
        });

        if (!product) {
            throw new ApiException(404, 'NOT_FOUND', 'Product not found');
        }

        return product;
    }

    /**
     * Update a product
     */
    static async updateProduct(userId: string, productId: string, data: Partial<{
        name: string;
        description: string;
        price: number;
        image: string;
        stock: number;
        categoryId: string;
        isAvailable: boolean;
    }>) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { merchant: true }
        });

        if (!product) {
            throw new ApiException(404, 'NOT_FOUND', 'Product not found');
        }

        if (product.merchant.userId !== userId) {
            throw new ApiException(403, 'FORBIDDEN', 'Unauthorized to update this product');
        }

        return prisma.product.update({
            where: { id: productId },
            data
        });
    }

    /**
     * Delete a product (Soft delete by setting isAvailable to false)
     */
    static async deleteProduct(userId: string, productId: string) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { merchant: true }
        });

        if (!product) {
            throw new ApiException(404, 'NOT_FOUND', 'Product not found');
        }

        if (product.merchant.userId !== userId) {
            throw new ApiException(403, 'FORBIDDEN', 'Unauthorized to delete this product');
        }

        return prisma.product.update({
            where: { id: productId },
            data: { isAvailable: false }
        });
    }
}
