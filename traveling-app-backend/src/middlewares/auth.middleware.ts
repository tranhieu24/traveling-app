import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { pool } from '../config/database';
import { AuthenticatedRequest, AppError } from '../types';

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Invalid token format.', 401, 'UNAUTHORIZED');
    }

    // Xác thực token với Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData?.user) {
      throw new AppError('Invalid or expired authentication session.', 401, 'INVALID_TOKEN');
    }

    const authUser = authData.user;

    // Lấy thông tin user từ PostgreSQL DB để có role, full_name, avatar_url
    const userResult = await pool.query(
      `SELECT id, email, full_name, avatar_url, role 
       FROM users 
       WHERE id = $1`,
      [authUser.id]
    );

    if (userResult.rows.length === 0) {
      // Tự động tạo bản ghi user trong DB nếu đăng ký qua Supabase Auth mà chưa có trong bảng users
      const newUser = await pool.query(
        `INSERT INTO users (id, email, full_name, avatar_url, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'guest', NOW(), NOW())
         RETURNING id, email, full_name, avatar_url, role`,
        [
          authUser.id,
          authUser.email || '',
          authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Traveler',
          authUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
        ]
      );
      req.user = newUser.rows[0];
    } else {
      req.user = userResult.rows[0];
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware tùy chọn cho phép khách xem thông tin, nhưng nếu có gửi Token thì đọc thông tin user (ví dụ kiểm tra đã favorite chưa)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: authData } = await supabaseAdmin.auth.getUser(token);
      if (authData?.user) {
        const userResult = await pool.query(
          `SELECT id, email, full_name, avatar_url, role FROM users WHERE id = $1`,
          [authData.user.id]
        );
        if (userResult.rows.length > 0) {
          req.user = userResult.rows[0];
        }
      }
    }
    next();
  } catch (error) {
    // Không chặn request, cho phép đi tiếp dưới tư cách guest
    next();
  }
};
