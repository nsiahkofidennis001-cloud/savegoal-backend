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
                storeId: merchant.id, // Using merchant.id as storeId for now if it's the only store
                merchantId: merchant.id,
                name: data.name,
                description: data.description,
                basePrice: data.price,
                imageUrl: data.image
            }
        });
    }

    /**
     * List all products (public)
     */
    static async listProducts() {
        return prisma.product.findMany({
            where: { isArchived: false },
            include: {
                store: {
                    select: {
                        name: true,
                        merchantId: true
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
                store: {
                    select: {
                        name: true,
                        merchantId: true
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
            where: { id: productId }
        });

        if (!product) {
            throw new ApiException(404, 'NOT_FOUND', 'Product not found');
        }

        const merchant = await prisma.merchantProfile.findUnique({
            where: { userId }
        });

        if (!merchant || product.merchantId !== merchant.id) {
            throw new ApiException(403, 'FORBIDDEN', 'Unauthorized to update this product');
        }

        const { price, image, isAvailable, ...otherData } = data;

        return prisma.product.update({
            where: { id: productId },
            data: {
                ...otherData,
                basePrice: price,
                imageUrl: image,
                isArchived: isAvailable !== undefined ? !isAvailable : undefined
            }
        });
    }

    /**
     * Delete a product (Soft delete by setting isAvailable to false)
     */
    static async deleteProduct(userId: string, productId: string) {
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            throw new ApiException(404, 'NOT_FOUND', 'Product not found');
        }

        const merchant = await prisma.merchantProfile.findUnique({
            where: { userId }
        });

        if (!merchant || product.merchantId !== merchant.id) {
            throw new ApiException(403, 'FORBIDDEN', 'Unauthorized to delete this product');
        }

        return prisma.product.update({
            where: { id: productId },
            data: { isArchived: true }
        });
    }
}
