import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, AppError } from '../types';
import { pool } from '../config/database';

export class AuthController {
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      return sendSuccess(res, req.user);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { fullName, avatarUrl, phoneNumber } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let index = 1;

      if (fullName !== undefined) {
        updates.push(`full_name = $${index++}`);
        values.push(fullName);
      }
      if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${index++}`);
        values.push(avatarUrl);
      }
      if (phoneNumber !== undefined) {
        updates.push(`phone_number = $${index++}`);
        values.push(phoneNumber);
      }

      if (updates.length === 0) {
        return sendSuccess(res, req.user);
      }

      updates.push(`updated_at = NOW()`);
      values.push(req.user.id);

      const sql = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${index} 
        RETURNING id, email, full_name, avatar_url, phone_number, role, created_at, updated_at
      `;
      const result = await pool.query(sql, values);

      return sendSuccess(res, result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
