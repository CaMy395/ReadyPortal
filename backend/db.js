import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

const { Pool } = pkg;

// Check if production or development
const isProduction = process.env.NODE_ENV === 'production';

const pool = isProduction
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Required for Render PostgreSQL
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false, // Optional SSL for local
    });

// Debug log to confirm environment
console.log('Environment:', process.env.NODE_ENV);
console.log('Connecting to:', isProduction ? process.env.DATABASE_URL : `${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

export default pool;
