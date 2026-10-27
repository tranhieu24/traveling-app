import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[Error Details]:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details || [],
      },
    });
  }

  // Xử lý lỗi PostgreSQL database errors
  if (err.code && typeof err.code === 'string') {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this information already exists.',
          details: [err.detail],
        },
      });
    }
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Referenced entity not found in database.',
          details: [err.detail],
        },
      });
    }
  }

  // Fallback 500 error
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred on the server.',
      details: process.env.NODE_ENV === 'development' ? [err.stack] : [],
    },
  });
};
