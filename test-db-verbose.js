import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

async function test(url, label) {
    console.log(`--- Testing ${label} ---`);
    const client = new Client({
        connectionString: url,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Connecting to:', url.replace(/:.+@/, ':****@'));
        await client.connect();
        console.log(`✅ Success for ${label}!`);
        const res = await client.query('SELECT NOW()');
        console.log('Result:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error(`❌ Failed for ${label}:`);
        console.error('Message:', err.message);
        console.error('Code:', err.code);
        console.error('Detail:', err.detail);
        console.error('Stack:', err.stack);
    }
}

async function run() {
    await test(process.env.DATABASE_URL, 'Pooled');
    await test(process.env.DIRECT_URL, 'Direct');
}

run();
