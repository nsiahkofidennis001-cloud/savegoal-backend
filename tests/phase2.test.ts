import { jest } from '@jest/globals';
jest.mock('better-auth/node');

import request from 'supertest';
import app from '../src/api/server.js';
import { prisma } from '../src/infra/prisma.client.js';
import { redis } from '../src/infra/redis.client.js';
import { auth } from '../src/modules/auth/auth.js';

describe('Phase 2: Core Savings Logic', () => {
    let userToken: string;
    let userId: string;

    beforeAll(async () => {
        // Create a test user directly in DB
        const user = await prisma.user.create({
            data: {
                name: 'Test Saver',
                email: `saver-${Date.now()}@test.com`,
                phone: `+233${Math.floor(100000000 + Math.random() * 900000000)}`,
                role: 'CONSUMER',
            },
        });
        userId = user.id;

        // Mock a better-auth session (simplified for testing if middleware allows injection of user)
        // Since we are testing end-to-end with the actual auth middleware, we might need a valid session.
        // For this test, I'll bypass the auth middleware by mocking the `req.body.user` injection 
        // OR by using a real session if I can generate one. 
        // Given better-auth internal complexity, I will mock the middleware behavior via a spy 
        // OR easier: assume the routes use `requireAuth` which checks `req.header`... 

        // Create a test session directly in DB
        const token = `test-token-${Date.now()}`;
        await prisma.session.create({
            data: {
                userId: user.id,
                token: token,
                expiresAt: new Date(Date.now() + 3600000),
            },
        });
        userToken = token;
    });

    afterAll(async () => {
        await prisma.transaction.deleteMany();
        await prisma.goal.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.session.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
        redis.disconnect();
    });

    // ==================== WALLET TESTS ====================

    it('should create a wallet automatically or on first get', async () => {
        const res = await request(app)
            .get('/api/wallet')
            .set('Authorization', `Bearer ${userToken}`); // Assuming cookie based auth
        // If header based: .set('Authorization', `Bearer ${userToken}`)

        // If auth fails here, we might need to adjust how we pass tokens depending on better-auth config.
        // Assuming cookie for now based on `auth.ts`.

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.currency).toBe('GHS');
        expect(res.body.data.balance).toBe("0"); // Decimal returns as string
    });

    it('should deposit money into wallet', async () => {
        const res = await request(app)
            .post('/api/wallet/deposit')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ amount: 100 });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.wallet.balance).toBe("100");
    });

    // ==================== GOAL TESTS ====================

    let goalId: string;

    it('should create a savings goal', async () => {
        const res = await request(app)
            .post('/api/goals')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'New Laptop',
                targetAmount: 2000,
                description: 'MacBook Pro M4',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('New Laptop');
        expect(res.body.data.status).toBe('ACTIVE');
        goalId = res.body.data.id;
    });

    it('should list user goals', async () => {
        const res = await request(app)
            .get('/api/goals')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].id).toBe(goalId);
    });

    it('should fail to fund goal if insufficient funds', async () => {
        const res = await request(app)
            .post(`/api/goals/${goalId}/fund`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ amount: 500 }); // Wallet has 100, needed 500

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fund goal successfully', async () => {
        const res = await request(app)
            .post(`/api/goals/${goalId}/fund`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ amount: 50 }); // Wallet has 100

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Check goal balance
        expect(res.body.data.goal.currentAmount).toBe("50");

        // Check wallet balance (100 - 50 = 50)
        // Checking via wallet endpoint to be sure
        const walletRes = await request(app)
            .get('/api/wallet')
            .set('Authorization', `Bearer ${userToken}`);

        expect(walletRes.body.data.balance).toBe("50");
    });
});
