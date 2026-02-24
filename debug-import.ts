import 'dotenv/config';
import { env } from './src/config/env.config.js';
console.log('Env loaded successfully');
import app from './src/api/server.js';
console.log('App loaded successfully');
import { auth } from './src/modules/auth/auth.js';
console.log('Auth loaded successfully');
process.exit(0);
