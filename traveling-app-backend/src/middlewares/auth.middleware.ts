import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { pool } from '../config/database';
import { AuthenticatedRequest, AppError } from '../types';
export const requireAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header) throw new AppError('Bearer token required',401,'AUTH_REQUIRED');
    const match = /^Bearer ([^\s]+)$/i.exec(header);
    if (!match) throw new AppError('Invalid Bearer token format',401,'INVALID_TOKEN');
    const {data,error} = await supabaseAdmin.auth.getUser(match[1]);
    if (error || !data.user) {
      if(error?.code==='user_banned') throw new AppError('Account blocked',403,'ACCOUNT_BLOCKED');
      const expired = error?.code==='jwt_expired' || /expired/i.test(error?.message||'');
      if (error && (error.status===0 || (error.status||0)>=500)) throw new AppError('Authentication service unavailable',503,'AUTH_UNAVAILABLE');
      throw new AppError(expired ? 'Session expired' : 'Invalid token',401,expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
    }
    const user = (await pool.query('SELECT id,email,full_name,avatar_url,phone_number,role,account_status,tokens_valid_after,created_at,updated_at FROM users WHERE id=$1',[data.user.id])).rows[0];
    if (!user) throw new AppError('User profile not provisioned',403,'PROFILE_NOT_FOUND');
    if (user.account_status!=='active') throw new AppError('Account blocked',403,'ACCOUNT_BLOCKED');
    const claims=JSON.parse(Buffer.from(match[1].split('.')[1],'base64url').toString('utf8'));
    if (user.tokens_valid_after && (!Number.isFinite(claims.iat) || claims.iat*1000<new Date(user.tokens_valid_after).getTime())) throw new AppError('Session revoked; sign in again',401,'SESSION_REVOKED');
    delete user.tokens_valid_after;
    req.user = user;
    next();
  } catch(error) { next(error); }
};
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
  req.headers.authorization ? requireAuth(req,res,next) : next();
export const requireAdmin = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Sign in required',401,'AUTH_REQUIRED'));
  if (req.user.role!=='admin') return next(new AppError('Admin permission required',403,'FORBIDDEN'));
  next();
};
