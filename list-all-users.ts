import { prisma } from './src/infra/prisma.client.js';

async function listUsers() {
    try {
        const users = await prisma.user.findMany();
        console.log('--- USERS IN DATABASE ---');
        users.forEach(user => {
            console.log(`Phone: ${user.phone} | Role: ${user.role} | Name: ${user.name}`);
        });
        console.log('-------------------------');
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

listUsers();
