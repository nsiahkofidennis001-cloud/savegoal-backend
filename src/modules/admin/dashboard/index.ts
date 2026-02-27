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
