import 'dotenv/config';
import { env } from '../src/config/env.config.js';

console.log('--- Environment Variable Debug ---');
console.log('ACCOUNT_SID:', env.TWILIO_ACCOUNT_SID);
console.log('AUTH_TOKEN Length:', env.TWILIO_AUTH_TOKEN?.length || 0);
console.log('AUTH_TOKEN First 4:', env.TWILIO_AUTH_TOKEN?.substring(0, 4));
console.log('AUTH_TOKEN Last 4:', env.TWILIO_AUTH_TOKEN?.substring((env.TWILIO_AUTH_TOKEN?.length || 0) - 4));
console.log('PHONE_NUMBER:', env.TWILIO_PHONE_NUMBER);

if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    console.log('✅ Twilio Credentials are set in the environment.');
} else {
    console.log('❌ Twilio Credentials are MISSING from the environment.');
}
