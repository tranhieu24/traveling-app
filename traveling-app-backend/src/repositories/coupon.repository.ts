import { PoolClient } from 'pg';
import { AppError } from '../types';
import { cents } from '../domain/booking';
export async function applyCoupon(client: PoolClient, code: string | undefined, listing: any, userId: string | undefined, roomCents: number, reserve = false) {
  if (!code) return { couponId: null, discountCents: 0 };
  if (!userId) throw new AppError('Sign in to quote a coupon', 401, 'AUTH_REQUIRED');
  const { rows } = await client.query(`SELECT * FROM coupons WHERE code=$1 ${reserve ? 'FOR UPDATE' : ''}`, [code.toUpperCase()]);
  const c = rows[0], now = Date.now();
  if (!c || !c.is_active || now < new Date(c.starts_at).getTime() || now >= new Date(c.ends_at).getTime() || c.used_count >= c.max_uses || roomCents < cents(c.min_subtotal) || (c.listing_id && c.listing_id !== listing.id) || (c.category_id && c.category_id !== listing.category_id)) throw new AppError('Coupon is inactive, expired, exhausted or inapplicable', 409, 'COUPON_NOT_APPLICABLE');
  const used = await client.query('SELECT count(*)::int n FROM coupon_redemptions WHERE coupon_id=$1 AND user_id=$2', [c.id,userId]);
  if (used.rows[0].n >= c.per_user_limit) throw new AppError('Coupon per-user limit reached',409,'COUPON_USER_LIMIT');
  return { couponId: c.id, discountCents: Math.min(roomCents, Math.round(roomCents * Number(c.discount_percent) / 100), c.max_discount === null ? roomCents : cents(c.max_discount)) };
}
