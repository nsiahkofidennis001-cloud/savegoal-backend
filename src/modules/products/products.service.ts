import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';

type ProductMetadata = {
    category?: string;
    sku?: string;
    images?: string[];
};

type ProductInput = {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    image?: string;
    stock?: number;
    category?: string;
    sku?: string;
    images?: string[];
};

type ProductUpdateInput = Partial<ProductInput> & {
    isAvailable?: boolean;
};

const merchantProductInclude = {
    merchant: {
        select: {
            businessName: true,
            isVerified: true,
        },
    },
} as const;

function readProductMetadata(metadata: unknown): ProductMetadata {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return {};
    }

    const value = metadata as Record<string, unknown>;

    return {
        category: typeof value.category === 'string' ? value.category : undefined,
        sku: typeof value.sku === 'string' ? value.sku : undefined,
        images: Array.isArray(value.images)
            ? value.images.filter((image): image is string => typeof image === 'string' && image.length > 0)
            : undefined,
    };
}

function buildProductMetadata(input: ProductUpdateInput, existingMetadata?: unknown): ProductMetadata | undefined {
    const current = readProductMetadata(existingMetadata);
    const next: ProductMetadata = {
        category: input.category ?? current.category,
        sku: input.sku ?? current.sku,
        images: input.images ?? current.images,
    };

    const hasValues = Object.values(next).some((value) => {
        if (Array.isArray(value)) {
            return value.length > 0;
        }

        return value !== undefined && value !== '';
    });

    return hasValues ? next : undefined;
}

function serializeProduct<T extends {
    image?: string | null;
    metadata?: unknown;
    merchant?: { businessName?: string; isVerified?: boolean } | null;
}>(product: T) {
    const metadata = readProductMetadata(product.metadata);
    const images = metadata.images?.length
        ? metadata.images
        : product.image
            ? [product.image]
            : [];

    return {
        ...product,
        brand: product.merchant?.businessName ?? null,
        merchantName: product.merchant?.businessName ?? null,
        category: metadata.category ?? null,
        sku: metadata.sku ?? null,
        image: product.image ?? images[0] ?? null,
        images,
    };
}

function serializeProducts<T extends {
    image?: string | null;
    metadata?: unknown;
    merchant?: { businessName?: string; isVerified?: boolean } | null;
}>(products: T[]) {
    return products.map((product) => serializeProduct(product));
}

export class ProductsService {
    private static async getMerchantByUserId(userId: string) {
        const merchant = await prisma.merchantProfile.findUnique({
            where: { userId },
        });

        if (!merchant) {
            throw new ApiException(403, 'FORBIDDEN', 'User is not a merchant');
        }

        return merchant;
    }

    private static async getOwnedProduct(userId: string, productId: string) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { merchant: true },
        });

        if (!product) {
            throw new ApiException(404, 'NOT_FOUND', 'Product not found');
        }

        if (product.merchant.userId !== userId) {
            throw new ApiException(403, 'FORBIDDEN', 'Unauthorized to access this product');
        }

        return product;
    }

    /**
     * Create a new product for a merchant
     */
    static async createProduct(userId: string, data: ProductInput) {
        const merchant = await this.getMerchantByUserId(userId);
        const metadata = buildProductMetadata(data);

        const product = await prisma.product.create({
            data: {
                merchantProfileId: merchant.id,
                name: data.name,
                description: data.description,
                price: data.price,
                currency: data.currency || 'GHS',
                image: data.image,
                stock: data.stock,
                metadata,
            },
            include: merchantProductInclude,
        });

        return serializeProduct(product);
    }

    /**
     * List all products (public)
     */
    static async listProducts() {
        const products = await prisma.product.findMany({
            where: { isAvailable: true },
            include: merchantProductInclude,
        });

        return serializeProducts(products);
    }

    /**
     * List products owned by the authenticated merchant.
     */
    static async listMerchantProducts(userId: string) {
        const merchant = await this.getMerchantByUserId(userId);

        const products = await prisma.product.findMany({
            where: { merchantProfileId: merchant.id },
            include: merchantProductInclude,
            orderBy: { createdAt: 'desc' },
        });

        return serializeProducts(products);
    }

    /**
     * Get a single product
     */
    static async getProduct(id: string) {
        const product = await prisma.product.findUnique({
            where: { id },
            include: merchantProductInclude,
        });

        if (!product) {
            throw new ApiException(404, 'NOT_FOUND', 'Product not found');
        }

        return serializeProduct(product);
    }

    /**
     * Get a product owned by the authenticated merchant.
     */
    static async getMerchantProduct(userId: string, productId: string) {
        await this.getMerchantByUserId(userId);

        const product = await this.getOwnedProduct(userId, productId);

        const merchantProduct = await prisma.product.findUnique({
            where: { id: product.id },
            include: merchantProductInclude,
        });

        if (!merchantProduct) {
            throw new ApiException(404, 'NOT_FOUND', 'Product not found');
        }

        return serializeProduct(merchantProduct);
    }

    /**
     * Update a product
     */
    static async updateProduct(userId: string, productId: string, data: ProductUpdateInput) {
        const product = await this.getOwnedProduct(userId, productId);
        const metadata = buildProductMetadata(data, product.metadata);

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                name: data.name,
                description: data.description,
                price: data.price,
                currency: data.currency,
                image: data.image,
                stock: data.stock,
                isAvailable: data.isAvailable,
                metadata,
            },
            include: merchantProductInclude,
        });

        return serializeProduct(updatedProduct);
    }

    /**
     * Delete a product (Soft delete by setting isAvailable to false)
     */
    static async deleteProduct(userId: string, productId: string) {
        await this.getOwnedProduct(userId, productId);

        return prisma.product.update({
            where: { id: productId },
            data: { isAvailable: false },
        });
    }
}
