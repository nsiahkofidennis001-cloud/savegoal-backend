import fetch from 'node-fetch';

const VERCE_ORIGIN = 'https://save-goal-frontend.vercel.app';
const API_URL = 'http://localhost:3000'; // Make sure the server is running locally

async function testCors() {
    console.log(`Testing CORS for origin: ${VERCE_ORIGIN}`);

    try {
        const response = await fetch(`${API_URL}/health`, {
            method: 'OPTIONS',
            headers: {
                'Origin': VERCE_ORIGIN,
                'Access-Control-Request-Method': 'GET'
            }
        });

        console.log('Status:', response.status);
        console.log('Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));

        if (response.headers.get('access-control-allow-origin') === VERCE_ORIGIN || response.headers.get('access-control-allow-origin') === '*') {
            console.log('✅ CORS check passed!');
        } else {
            console.log('❌ CORS check failed!');
        }
    } catch (error) {
        console.error('Error connecting to server. Is it running?', error.message);
    }
}

testCors();
