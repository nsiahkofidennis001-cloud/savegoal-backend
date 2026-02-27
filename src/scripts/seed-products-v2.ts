import { prisma } from '../infra/prisma.client.js';

export async function seedExpandedProducts() {
    console.log('🚀 Starting Expanded Product Seeding...');

    try {
        let merchant = await prisma.merchantProfile.findFirst();
        if (!merchant) throw new Error('Merchant not found. Run basic seed first.');

        const expandedProducts = [
            // Fashion & Apparel
            {
                name: 'Nike Air Jordan 1 Low',
                description: 'Classic basketball sneakers with a timeless look and premium leather.',
                price: 1800,
                image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1000&auto=format&fit=crop',
                stock: 25
            },
            {
                name: 'Adidas Ultraboost Light',
                description: 'Experience epic energy with the new Ultraboost Light, our lightest ever.',
                price: 2200,
                image: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?q=80&w=1000&auto=format&fit=crop',
                stock: 15
            },
            {
                name: 'Apple Watch Ultra 2',
                description: 'The most rugged and capable Apple Watch. Designed for the extremes.',
                price: 8500,
                image: 'https://images.unsplash.com/photo-1695759206385-a73428801d0f?q=80&w=1000&auto=format&fit=crop',
                stock: 7
            },
            // Home Appliances
            {
                name: 'Dyson V15 Detect Vacuum',
                description: 'The most powerful, intelligent cordless vacuum. Reveals invisible dust.',
                price: 6500,
                image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?q=80&w=1000&auto=format&fit=crop',
                stock: 10
            },
            {
                name: 'Nespresso Vertuo Pop',
                description: 'Add a touch of color to your life with the Nespresso Vertuo Pop machine.',
                price: 1500,
                image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?q=80&w=1000&auto=format&fit=crop',
                stock: 30
            },
            {
                name: 'Samsung Bespoke Fridge',
                description: 'Customizable door colors and flexible storage for a personalized kitchen.',
                price: 25000,
                image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000&auto=format&fit=crop',
                stock: 4
            },
            // Computing & Office
            {
                name: 'Dell UltraSharp 32" 4K Monitor',
                description: 'Experience brilliant color and superior screen performance with this 4K monitor.',
                price: 9500,
                image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=1000&auto=format&fit=crop',
                stock: 12
            },
            {
                name: 'Logitech MX Master 3S',
                description: 'The iconic mouse remastered for ultimate precision and flow.',
                price: 1200,
                image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=1000&auto=format&fit=crop',
                stock: 50
            },
            {
                name: 'Herman Miller Aeron Chair',
                description: 'The gold standard in ergonomic office seating. Comfort that supports you all day.',
                price: 14000,
                image: 'https://images.unsplash.com/photo-1505797149-43b007664a3d?q=80&w=1000&auto=format&fit=crop',
                stock: 6
            },
            // Entertainment
            {
                name: 'Nintendo Switch OLED',
                description: 'Play at home on the TV or on the go with a vibrant 7-inch OLED screen.',
                price: 4500,
                image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?q=80&w=1000&auto=format&fit=crop',
                stock: 18
            },
            {
                name: 'Meta Quest 3 VR Headset',
                description: 'The most powerful Quest yet, featuring breakthrough mixed reality.',
                price: 6000,
                image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?q=80&w=1000&auto=format&fit=crop',
                stock: 14
            },
            {
                name: 'Marshall Stanmore III Speaker',
                description: 'The classic Marshall look with room-filling sound and Bluetooth 5.2.',
                price: 3800,
                image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=1000&auto=format&fit=crop',
                stock: 22
            }
        ];

        let count = 0;
        for (const pd of expandedProducts) {
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

        console.log(`🎉 Successfully added ${count} more products!`);
        return true;
    } catch (err: any) {
        console.error('❌ Error seeding products:', err.message);
        throw err;
    }
}
