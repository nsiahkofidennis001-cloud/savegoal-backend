import request from 'supertest';
import app from '../src/api/server.js';
import { prisma } from '../src/infra/prisma.client.js';
import { redis } from '../src/infra/redis.client.js';

describe('Merchant Onboarding Profile Creation', () => {
    let userToken: string;
    let userId: string;

    beforeAll(async () => {
        // Create a test user directly in DB
        const user = await prisma.user.create({
            data: {
                name: 'Merchant Test',
                email: `merchant-${Date.now()}@test.com`,
                phone: `+233${Math.floor(100000000 + Math.random() * 900000000)}`,
                role: 'CONSUMER',
            },
        });
        userId = user.id;

        const session = await prisma.session.create({
            data: {
                userId: user.id,
                token: `test-merchant-token-${Date.now()}`,
                expiresAt: new Date(Date.now() + 3600000),
            },
        });
        userToken = session.token;
    });

    afterAll(async () => {
        await prisma.merchantProfile.deleteMany({ where: { userId } });
        await prisma.profile.deleteMany({ where: { userId } });
        await prisma.session.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
        await prisma.$disconnect();
        redis.disconnect();
    });

    it('should create both MerchantProfile and Profile on onboarding', async () => {
        const res = await request(app)
            .post('/api/merchants/onboard')
            .set('Cookie', `better-auth.session_token=${userToken}`)
            .send({
                businessName: 'Test Business',
                contactEmail: 'biz@test.com',
                contactPhone: '+233123456789',
                businessAddress: '123 Test St',
            });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');

        // Verify MerchantProfile exists
        const merchantProfile = await prisma.merchantProfile.findUnique({
            where: { userId }
        });
        expect(merchantProfile).not.toBeNull();
        expect(merchantProfile?.businessName).toBe('Test Business');

        // Verify Profile exists (The Fix!)
        const profile = await prisma.profile.findUnique({
            where: { userId }
        });
        expect(profile).not.toBeNull();
        expect(profile?.firstName).toBe('Merchant');
        expect(profile?.lastName).toBe('Test');
        expect(profile?.kycStatus).toBe('PENDING');

        // Verify User role updated
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        expect(user?.role).toBe('MERCHANT');
    });
});
