import { prisma } from '../infra/prisma.client.js';

/**
 * Script to seed sample products for testing the frontend marketplace.
 */
export async function seedProducts() {
    console.log('🚀 Starting product seeding...');

    try {
        // 1. Get or create a sample merchant
        let merchant = await prisma.merchantProfile.findFirst();

        if (!merchant) {
            console.log('ℹ️ No merchant found. Creating a sample merchant...');
            // Need a user first
            let user = await prisma.user.findFirst({ where: { role: 'MERCHANT' } });
            if (!user) {
                user = await prisma.user.create({
                    data: {
                        email: 'merchant@example.com',
                        name: 'Global Tech Merchant',
                        role: 'MERCHANT'
                    }
                });
            }

            merchant = await prisma.merchantProfile.create({
                data: {
                    userId: user.id,
                    businessName: 'Global Tech Hub',
                    contactEmail: 'sales@globaltech.com',
                    contactPhone: '+233240000000',
                    businessAddress: '123 Tech Lane, Accra',
                    isVerified: true
                }
            });
        }

        console.log(`✅ Using merchant: ${merchant.businessName} (ID: ${merchant.id})`);

        // 2. Sample Products Data
        const productsData = [
            {
                name: 'iPhone 15 Pro',
                description: 'The latest Apple iPhone with Titanium design and A17 Pro chip.',
                price: 15000,
                image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=1000&auto=format&fit=crop',
                stock: 10
            },
            {
                name: 'MacBook Pro 14"',
                description: 'Supercharged by M3 Pro. The world\'s most advanced chips for personal computers.',
                price: 22000,
                image: 'https://images.unsplash.com/photo-1517336714460-4c9889a79683?q=80&w=1000&auto=format&fit=crop',
                stock: 5
            },
            {
                name: 'Sony WH-1000XM5',
                description: 'Industry-leading noise canceling with two processors controlling eight microphones.',
                price: 4500,
                image: 'https://images.unsplash.com/photo-1678120612455-accf0a0ee4de?q=80&w=1000&auto=format&fit=crop',
                stock: 20
            },
            {
                name: 'Samsung Galaxy S24 Ultra',
                description: 'The ultimate Galaxy Ultra with Galaxy AI and 200MP camera.',
                price: 18000,
                image: 'https://images.unsplash.com/photo-1707010486016-8d147814b301?q=80&w=1000&auto=format&fit=crop',
                stock: 12
            },
            {
                name: 'PlayStation 5 Console',
                description: 'Experience lightning-fast loading and deeper immersion with support for haptic feedback.',
                price: 7500,
                image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=1000&auto=format&fit=crop',
                stock: 8
            },
            {
                name: 'LG C3 OLED TV 55"',
                description: 'Self-lit pixels made even brighter. Deepest blacks and vibrant colors.',
                price: 12000,
                image: 'https://images.unsplash.com/photo-1593359674251-60a35db4057f?q=80&w=1000&auto=format&fit=crop',
                stock: 3
            }
        ];

        // 3. Insert Products
        let count = 0;
        for (const pd of productsData) {
            // Check if exists
            const existing = await prisma.product.findFirst({ where: { name: pd.name } });
            if (!existing) {
                await prisma.product.create({
                    data: {
                        merchantProfileId: merchant.id,
                        ...pd,
                        currency: 'GHS',
                        isAvailable: true
                    }
                });
                count++;
            }
        }

        console.log(`🎉 Successfully seeded ${count} new products!`);
        return true;
    } catch (err: any) {
        console.error('❌ Error seeding products:', err.message);
        throw err;
    }
}
