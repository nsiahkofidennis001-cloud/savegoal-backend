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
                stock: data.stock
            }
        });
    }

    /**
     * List all products (public)
     */
    static async listProducts() {
        return prisma.product.findMany({
            where: { isAvailable: true },
            include: {
                merchant: {
                    select: {
                        businessName: true,
                        isVerified: true
                    }
                }
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
