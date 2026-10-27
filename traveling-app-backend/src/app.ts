import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { pool } from './config/database';

export const createApp = () => {
  const app = express();

  // Security middlewares
  app.use(helmet());
  app.use(cors({ origin: '*' }));

  // Request rate limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 200, // Giới hạn 200 requests mỗi IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests created from this IP, please try again after 15 minutes',
      },
    },
  });
  app.use(limiter);

  // Body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint (Dùng ping khởi động server Render hoặc giám sát container)
  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: err.message,
      });
    }
  });

  // REST API v1
  app.use('/api/v1', apiRouter);

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
