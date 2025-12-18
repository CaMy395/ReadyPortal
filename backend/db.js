import pkg from 'pg';
import dotenv from 'dotenv';

// Load env vars once
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config();
}

const { Pool } = pkg;
const isProduction = process.env.NODE_ENV === 'production';

// Create pool
const pool = isProduction
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT || 5432),
      // If your dev DB is ALSO hosted (Neon/Supabase/Render), you may need:
      // ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    });

// ✅ Prevent Node from crashing on dropped DB connections
pool.on('error', (err) => {
  console.error('❌ Unexpected PG pool error (idle client):', err);
  // Do NOT throw — keep server alive
});

export default pool;
