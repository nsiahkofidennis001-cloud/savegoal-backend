import { prisma } from '../src/infra/prisma.client.js';

async function listUsers() {
    const users = await prisma.user.findMany({
        take: 5,
        select: { id: true, name: true, phone: true }
    });
    console.log('--- Current Users ---');
    console.dir(users, { depth: null });
}

listUsers().catch(console.error).finally(() => prisma.$disconnect());
