import { Pool, QueryResultRow, types } from 'pg';
import { ENV } from './env';

// Preserve calendar dates without JS timezone conversion.
types.setTypeParser(1082, value => value);

export const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  ssl:
    ENV.DATABASE_SSL === 'disable'
      ? false
      : ENV.DATABASE_SSL === 'verify'
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err);
});

export const query = async <T extends QueryResultRow = any>(text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (ENV.NODE_ENV === 'development') {
    console.log(`[SQL Query] (${duration}ms) ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`);
  }
  return res;
};
