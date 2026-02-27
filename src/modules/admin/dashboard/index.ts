import { Router, Request, Response } from 'express';
import { dashboardLayout } from './layout.js';
import { overviewPage } from './pages/overview.js';
import { usersPage } from './pages/users.js';
import { kycPage } from './pages/kyc.js';
import { merchantsPage } from './pages/merchants.js';
import { transactionsPage } from './pages/transactions.js';
import { activityPage } from './pages/activity.js';

const router = Router();

// Helper to send HTML
function sendPage(res: Response, title: string, activePage: string, content: string) {
    res.setHeader('Content-Type', 'text/html');
    res.send(dashboardLayout(title, activePage, content));
}

// EMERGENCY FIX (Unprotected temporarily)
router.get('/emergency-fix', async (req, res) => {
    const { email, pwd } = req.query;
    if (email !== 'nsiahkofidennis001@gmail.com') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const { prisma } = await import('../../../infra/prisma.client.js');
        const { auth } = await import('../../auth/auth.js');

        const user = await prisma.user.findUnique({ where: { email: email as string } });
        if (!user) {
            const allUsers = await prisma.user.findMany({ select: { email: true }, take: 10 });
            return res.json({ error: 'User not found', detectedUsers: allUsers.map(u => u.email) });
        }

        const tempEmail = `temp-${Date.now()}@example.com`;
        const tempUser = await auth.api.signUpEmail({
            body: { email: tempEmail, password: pwd as string, name: 'Temp' }
        });
        if (!tempUser || !tempUser.user) throw new Error('Hash generation failed');

        const tempAccount = await prisma.account.findFirst({ where: { userId: tempUser.user.id } });
        const hash = tempAccount?.password;
        if (!hash) throw new Error('Hash not found');

        await prisma.account.upsert({
            where: { id: (await prisma.account.findFirst({ where: { userId: user.id, providerId: 'credential' } }))?.id || 'none' },
            create: { userId: user.id, accountId: email as string, providerId: 'credential', password: hash },
            update: { password: hash }
        });

        await prisma.user.delete({ where: { id: tempUser.user.id } });
        return res.json({ success: true, message: `Password set for ${email}. Log in now!` });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// Dashboard pages (HTML — no auth middleware here, auth is checked via API calls)
router.get('/', (_req: Request, res: Response) => {
    sendPage(res, 'Dashboard Overview', 'overview', overviewPage());
});

router.get('/users', (_req: Request, res: Response) => {
    sendPage(res, 'User Management', 'users', usersPage());
});

router.get('/kyc', (_req: Request, res: Response) => {
    sendPage(res, 'KYC Review', 'kyc', kycPage());
});

router.get('/merchants', (_req: Request, res: Response) => {
    sendPage(res, 'Merchant Management', 'merchants', merchantsPage());
});

router.get('/transactions', (_req: Request, res: Response) => {
    sendPage(res, 'Transaction Monitor', 'transactions', transactionsPage());
});

router.get('/activity', (_req: Request, res: Response) => {
    sendPage(res, 'Activity Feed', 'activity', activityPage());
});

export default router;
