import { execSync } from 'child_process';
import fetch from 'node-fetch';

const URL = 'http://localhost:3000';
const phone = '+233546351308';
let token = '';

async function run() {
    console.log('--- RUNNING API SMOKE TESTS ---');

    console.log('1. Health check');
    let res = await fetch(`${URL}/health`);
    console.log('   Health status:', res.status, (await res.json()).status);

    console.log('2. Request OTP');
    res = await fetch(`${URL}/api/auth/phone/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
    });
    const otpData = await res.json();
    console.log('   OTP sent:', otpData.success, 'Code:', otpData.data.devOtp);

    console.log('3. Verify OTP (Login)');
    res = await fetch(`${URL}/api/auth/phone/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otpData.data.devOtp, name: 'Test User' })
    });
    const loginData = await res.json();
    token = loginData.data?.session?.token;
    console.log('   Login success:', loginData.success, 'Role:', loginData.data?.user?.role);

    if (!token) {
        console.error('   FAILED to get token');
        return;
    }

    console.log('4. Check Wallet Balance');
    res = await fetch(`${URL}/api/wallet`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('   Wallet fetched:', res.status, (await res.json()).success);

    console.log('5. Deposit to Wallet');
    res = await fetch(`${URL}/api/wallet/deposit`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 })
    });
    console.log('   Deposit success:', res.status, (await res.json()).success);

    console.log('6. Create Goal');
    res = await fetch(`${URL}/api/goals`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Goal', targetAmount: 500 })
    });
    console.log('   Goal created:', res.status, (await res.json()).success);

    console.log('7. Submit KYC Selfie');
    res = await fetch(`${URL}/api/kyc/selfie`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfieImageUrl: 'https://example.com/selfie.jpg' })
    });
    const kycRes = await res.json();
    console.log('   Selfie submitted:', res.status, kycRes.success || kycRes.error?.message);

    console.log('--- TESTS COMPLETE ---');
}

run().catch(console.error);
