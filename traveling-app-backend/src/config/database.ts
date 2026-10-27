import { Pool } from 'pg';
import { ENV } from './env';

export const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Kết nối Session Pooler Cổng 5432 Supabase
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err);
});

export const query = async <T = any>(text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (ENV.NODE_ENV === 'development') {
    console.log(`[SQL Query] (${duration}ms) ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`);
  }
  return res;
};
