import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

async function testConnection() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Connecting to:', process.env.DATABASE_URL.replace(/:.+@/, ':****@'));
        await client.connect();
        console.log('✅ Successfully connected to PostgreSQL!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('❌ Failed to connect to PostgreSQL:', err);
    }
}

testConnection();
