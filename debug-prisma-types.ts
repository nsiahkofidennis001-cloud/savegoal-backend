import { prisma } from './src/infra/prisma.client.js';

async function main() {
    const product = await prisma.product.findFirst();
    if (product) {
        console.log(product.price);
    }
}
