import { auth } from './src/modules/auth/auth.js';
console.log('Auth API keys:', Object.keys(auth.api));
process.exit(0);
