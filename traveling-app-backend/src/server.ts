import { createApp } from './app';
import { ENV } from './config/env';
import { pool } from './config/database';

const app = createApp();

const startServer = async () => {
  try {
    // Kiểm tra kết nối Database
    const dbTest = await pool.query('SELECT NOW()');
    console.log(`[Database Connected]: PostgreSQL ready at ${dbTest.rows[0].now}`);

    const server = app.listen(ENV.PORT, () => {
      console.log(`🚀 Traveling App Backend Server running on port ${ENV.PORT}`);
      console.log(`📡 Health Check URL: http://localhost:${ENV.PORT}/health`);
      console.log(`📖 API Base URL: http://localhost:${ENV.PORT}/api/v1`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n[${signal}] Received. Shutting down gracefully...`);
      server.close(async () => {
        await pool.end();
        console.log('[PostgreSQL Pool Closed]');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
