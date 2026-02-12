require('dotenv').config();
console.log('Environment variables loaded successfully');
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) : 'undefined');
