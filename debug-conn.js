import pkg from 'pg';
const { Client } = pkg;

async function test(url, label) {
    console.log(`Testing ${label}...`);
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        console.log(`✅ Success for ${label}!`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`❌ Failed for ${label}: ${err.message}`);
        return false;
    }
}

async function run() {
    const passVariations = [
        { pass: 'MychoiceHotel123@', label: 'Raw @' },
        { pass: 'MychoiceHotel123%40', label: 'Encoded %40' },
        { pass: 'MychoiceHotel123', label: 'No @' }
    ];

    const dbVariations = ['savegoal', 'postgres'];

    for (const db of dbVariations) {
        for (const v of passVariations) {
            const url = `postgresql://postgres:${v.pass}@localhost:5432/${db}`;
            if (await test(url, `${v.label} on ${db}`)) {
                console.log(`\nFound working URL: ${url}`);
                process.exit(0);
            }
        }
    }
}

run();
