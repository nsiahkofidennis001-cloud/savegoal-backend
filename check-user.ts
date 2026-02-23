import { prisma } from './src/infra/prisma.client.js';

async function check() {
    const email = 'nsiahkofidennis001@gmail.com';
    const phone = '+233546351309';

    const byEmail = await prisma.user.findUnique({ where: { email } });
    const byPhone = await prisma.user.findUnique({ where: { phone } });

    console.log('User by email:', byEmail ? 'Found' : 'Not found');
    if (byEmail) console.log(JSON.stringify(byEmail, null, 2));

    console.log('User by phone:', byPhone ? 'Found' : 'Not found');
    if (byPhone) console.log(JSON.stringify(byPhone, null, 2));

    process.exit(0);
}

check();
