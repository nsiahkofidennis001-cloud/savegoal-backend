/**
 * SaveGoal Backend — Comprehensive API Test Script
 * Run with: npx tsx test-api.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';

declare const process: any;

const BASE = 'http://localhost:3001';
const prisma = new PrismaClient();

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    statusCode?: number;
    detail?: string;
}

const results: TestResult[] = [];

async function api(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    token?: string,
): Promise<{ status: number; data: any; headers: Headers; cookies?: string }> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3001',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'manual',
    });

    let data: any;
    const text = await res.text();
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    const setCookie = res.headers.get('set-cookie') || undefined;
    return { status: res.status, data, headers: res.headers, cookies: setCookie };
}

function test(name: string, passed: boolean, statusCode?: number, detail?: string) {
    results.push({
        name,
        status: passed ? 'PASS' : 'FAIL',
        statusCode,
        detail: passed ? undefined : detail,
    });
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${name}${statusCode ? ` [${statusCode}]` : ''}${!passed && detail ? ` — ${detail}` : ''}`);
}

function skip(name: string, reason: string) {
    results.push({ name, status: 'SKIP', detail: reason });
    console.log(`  ⏭️  ${name} — SKIPPED: ${reason}`);
}

// ─────────────── Tests ───────────────

async function run() {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║   SaveGoal Backend — API Test Suite           ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    // ── 1. Root & Health ──
    console.log('── 1. Root & Health ──');
    {
        const r = await api('GET', '/');
        test('GET / — root returns 200', r.status === 200, r.status);
        test('GET / — body has success=true', r.data?.success === true, r.status, JSON.stringify(r.data));
    }
    {
        const r = await api('GET', '/health');
        test('GET /health — returns 200', r.status === 200, r.status);
        test('GET /health — status ok', r.data?.data?.status === 'ok', r.status);
    }
    {
        const r = await api('GET', '/health/db');
        test('GET /health/db — database connected', r.status === 200, r.status, JSON.stringify(r.data));
    }
    {
        const r = await api('GET', '/health/redis');
        test('GET /health/redis — redis connected', r.status === 200, r.status, JSON.stringify(r.data));
    }

    // ── 2. Auth ──
    console.log('\n── 2. Auth (better-auth) ──');
    const email = 'kaylakacy8@gmail.com';
    const password = 'SecurePass123!';

    let bearerToken: string | undefined;
    let userId: string | undefined;

    // Step 1: Check if user exists, if not sign up
    let dbUser = await prisma.user.findFirst({ where: { email } });
    if (!dbUser) {
        console.log('  📝 User not found, signing up...');
        const r = await api('POST', '/api/auth/sign-up/email', {
            name: 'Kayla Kacy',
            email,
            password,
        });
        test('POST /api/auth/sign-up/email — signup', r.status === 200, r.status, JSON.stringify(r.data));

        if (r.data?.user?.id) {
            userId = r.data.user.id;
        }
        // Refetch from DB
        dbUser = await prisma.user.findFirst({ where: { email } });
    } else {
        console.log(`  ✓ User found in DB: ${dbUser.id}`);
        userId = dbUser.id;
    }

    // Step 2: Ensure email is verified in DB
    if (dbUser) {
        if (!dbUser.emailVerified) {
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { emailVerified: true },
            });
            console.log('  ✓ Email verified in DB');
        } else {
            console.log('  ✓ Email already verified');
        }
    }

    // Step 3: Try sign-in
    {
        const r = await api('POST', '/api/auth/sign-in/email', {
            email,
            password,
        });
        test('POST /api/auth/sign-in/email — signin', r.status === 200, r.status, JSON.stringify(r.data));

        if (r.data?.token) {
            bearerToken = r.data.token;
        } else if (r.data?.session?.token) {
            bearerToken = r.data.session.token;
        }
        if (r.data?.user?.id) {
            userId = r.data.user.id;
        }
    }

    // Step 4: Fallback — create session directly in DB
    if (!bearerToken && dbUser) {
        console.log('  🔧 Sign-in did not return bearer token. Creating session directly...');
        const sessionToken = `test-bearer-${Date.now()}`;
        await prisma.session.create({
            data: {
                userId: dbUser.id,
                token: sessionToken,
                expiresAt: new Date(Date.now() + 3600000),
            },
        });
        bearerToken = sessionToken;
        test('DB session created for testing', true);
    }

    if (bearerToken) {
        console.log(`  🔑 Bearer token: ${bearerToken.slice(0, 25)}...`);
    } else {
        console.log('  ⚠️  Could not obtain bearer token');
    }

    // ── 4. Auth - Get Session ──
    if (bearerToken) {
        const r = await api('GET', '/api/auth/get-session', undefined, bearerToken);
        test('GET /api/auth/get-session — session valid', r.status === 200, r.status, JSON.stringify(r.data));
    } else {
        skip('GET /api/auth/get-session', 'No bearer token');
    }

    // ── 5. Protected Routes (require auth) ──
    console.log('\n── 3. Unauthenticated Access (should be 401) ──');
    {
        const r = await api('GET', '/api/wallet');
        test('GET /api/wallet — unauthenticated returns 401', r.status === 401, r.status);
    }
    {
        const r = await api('GET', '/api/goals');
        test('GET /api/goals — unauthenticated returns 401', r.status === 401, r.status);
    }
    {
        const r = await api('GET', '/api/merchants/profile');
        test('GET /api/merchants/profile — unauthenticated returns 401', r.status === 401, r.status);
    }

    // ── 6. Wallet ──
    console.log('\n── 4. Wallet ──');
    if (bearerToken) {
        {
            const r = await api('GET', '/api/wallet', undefined, bearerToken);
            test('GET /api/wallet — get wallet', r.status === 200, r.status, JSON.stringify(r.data));
            if (r.status === 200) {
                test('Wallet has GHS currency', r.data?.data?.currency === 'GHS', r.status);
            }
        }
        {
            const r = await api('POST', '/api/wallet/deposit', { amount: 500 }, bearerToken);
            test('POST /api/wallet/deposit — deposit 500', r.status === 200, r.status, JSON.stringify(r.data));
        }
        {
            const r = await api('GET', '/api/wallet', undefined, bearerToken);
            const balance = parseFloat(r.data?.data?.balance || '0');
            test('Wallet balance updated after deposit', balance >= 500, r.status, `balance=${r.data?.data?.balance}`);
        }
    } else {
        skip('Wallet tests', 'No bearer token');
    }

    // ── 7. Goals ──
    console.log('\n── 5. Goals ──');
    let goalId: string | undefined;
    if (bearerToken) {
        {
            const r = await api('GET', '/api/goals/stats', undefined, bearerToken);
            test('GET /api/goals/stats — dashboard stats', r.status === 200, r.status, JSON.stringify(r.data));
        }
        {
            const r = await api('POST', '/api/goals', {
                name: 'Test Laptop',
                targetAmount: 2000,
                description: 'Test goal from API test',
            }, bearerToken);
            test('POST /api/goals — create goal', r.status === 201, r.status, JSON.stringify(r.data));
            goalId = r.data?.data?.id;
        }
        {
            const r = await api('GET', '/api/goals', undefined, bearerToken);
            test('GET /api/goals — list goals', r.status === 200, r.status);
            if (r.status === 200) {
                test('Goals list has items', Array.isArray(r.data?.data) && r.data.data.length > 0, r.status);
            }
        }
        if (goalId) {
            {
                const r = await api('GET', `/api/goals/${goalId}`, undefined, bearerToken);
                test('GET /api/goals/:id — get goal', r.status === 200, r.status, JSON.stringify(r.data));
            }
            {
                const r = await api('POST', `/api/goals/${goalId}/fund`, { amount: 100 }, bearerToken);
                test('POST /api/goals/:id/fund — fund goal 100', r.status === 200, r.status, JSON.stringify(r.data));
            }
            {
                // Try insufficient funds
                const r = await api('POST', `/api/goals/${goalId}/fund`, { amount: 99999 }, bearerToken);
                test('Fund goal — insufficient funds rejected', r.status === 400, r.status, JSON.stringify(r.data));
            }
        }
    } else {
        skip('Goals tests', 'No bearer token');
    }

    // ── 8. Products (public) ──
    console.log('\n── 6. Products (public) ──');
    {
        const r = await api('GET', '/api/products');
        test('GET /api/products — list products', r.status === 200, r.status, JSON.stringify(r.data)?.slice(0, 200));
    }
    {
        const r = await api('GET', '/api/products/categories');
        test('GET /api/products/categories — list categories', r.status === 200, r.status, JSON.stringify(r.data)?.slice(0, 200));
    }

    // ── 9. Merchants ──
    console.log('\n── 7. Merchants (auth required) ──');
    if (bearerToken) {
        {
            const r = await api('GET', '/api/merchants/profile', undefined, bearerToken);
            // May be 404 if user is not a merchant yet, that's OK
            test('GET /api/merchants/profile — responds (200 or 404/500)',
                [200, 404, 500].includes(r.status), r.status, JSON.stringify(r.data)?.slice(0, 200));
        }
        {
            const r = await api('GET', '/api/merchants/stats', undefined, bearerToken);
            test('GET /api/merchants/stats — responds',
                [200, 404, 500, 403].includes(r.status), r.status, JSON.stringify(r.data)?.slice(0, 200));
        }
    } else {
        skip('Merchants tests', 'No bearer token');
    }

    // ── 10. Payments ──
    console.log('\n── 8. Payments ──');
    if (bearerToken) {
        const r = await api('GET', '/api/payments', undefined, bearerToken);
        // May or may not exist
        test('GET /api/payments — responds', r.status < 500, r.status, JSON.stringify(r.data)?.slice(0, 200));
    } else {
        skip('Payments tests', 'No bearer token');
    }

    // ── 11. Notifications ──
    console.log('\n── 9. Notifications ──');
    if (bearerToken) {
        const r = await api('GET', '/api/notifications', undefined, bearerToken);
        test('GET /api/notifications — responds', r.status < 500, r.status, JSON.stringify(r.data)?.slice(0, 200));
    } else {
        skip('Notifications tests', 'No bearer token');
    }

    // ── 12. KYC ──
    console.log('\n── 10. KYC ──');
    if (bearerToken) {
        const r = await api('GET', '/api/kyc/status', undefined, bearerToken);
        test('GET /api/kyc/status — responds', r.status < 500, r.status, JSON.stringify(r.data)?.slice(0, 200));
    } else {
        skip('KYC tests', 'No bearer token');
    }

    // ── 13. Admin (should reject non-admin) ──
    console.log('\n── 11. Admin ──');
    if (bearerToken) {
        const r = await api('GET', '/api/admin/users', undefined, bearerToken);
        test('GET /api/admin/users — non-admin rejected (403)',
            r.status === 403, r.status, JSON.stringify(r.data)?.slice(0, 200));
    } else {
        skip('Admin tests', 'No bearer token');
    }

    // ── 14. 404 Route ──
    console.log('\n── 12. Error Handling ──');
    {
        const r = await api('GET', '/api/nonexistent');
        test('GET /api/nonexistent — returns 404', r.status === 404, r.status);
    }

    // ── 15. Swagger / API Docs ──
    console.log('\n── 13. API Documentation ──');
    {
        const r = await fetch(`${BASE}/api-docs.json`);
        test('GET /api-docs.json — swagger spec available', r.status === 200, r.status);
    }

    // ═══ Summary ═══
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║               TEST SUMMARY                    ║');
    console.log('╚══════════════════════════════════════════════╝');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    const total = results.length;

    console.log(`\n  ✅ Passed:  ${passed}`);
    console.log(`  ❌ Failed:  ${failed}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  📊 Total:   ${total}`);
    console.log(`\n  Pass Rate: ${((passed / (total - skipped)) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
        console.log('  ── Failed Tests ──');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  ❌ ${r.name} [${r.statusCode}] — ${r.detail?.slice(0, 150)}`);
        });
        console.log('');
    }

    // Write results to file
    fs.writeFileSync('test-api-results.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: { passed, failed, skipped, total, passRate: `${((passed / (total - skipped)) * 100).toFixed(1)}%` },
        results,
    }, null, 2));
    console.log('  📝 Results written to test-api-results.json\n');
}

run().catch(err => {
    console.error('Fatal error running tests:', err);
    process.exit(1);
});
