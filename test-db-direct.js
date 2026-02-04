import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

async function testConnection() {
    const client = new Client({
        connectionString: process.env.DIRECT_URL,
    });

    try {
        console.log('Connecting to (Direct):', process.env.DIRECT_URL.replace(/:.+@/, ':****@'));
        await client.connect();
        console.log('✅ Successfully connected to PostgreSQL (Direct)!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('❌ Failed to connect to PostgreSQL (Direct):');
        console.error(JSON.stringify(err, null, 2));
        console.error(err);
    }
}

testConnection();
