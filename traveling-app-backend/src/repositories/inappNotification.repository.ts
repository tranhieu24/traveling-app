import { pool } from '../config/database';
import { presentNotification, NotificationRecord } from '../domain/notification';
import { AppError } from '../types';

export class InappNotificationRepository {
  async unreadCount(userId: string) {
    return (await pool.query('SELECT count(*)::int AS count FROM notification_outbox WHERE user_id=$1 AND read_at IS NULL', [userId])).rows[0].count as number;
  }

  async list(userId: string, page: number, limit: number, unreadOnly: boolean, language: 'vi' | 'en' = 'vi') {
    const result = await pool.query(`
      WITH filtered AS (
        SELECT o.id,o.event_type,b.id AS booking_id,b.booking_code,
          o.payload->>'amount' AS amount,o.payload->>'currency' AS currency,o.created_at,o.read_at
        FROM notification_outbox o
        LEFT JOIN bookings b ON b.id=o.booking_id AND b.guest_id=o.user_id
        WHERE o.user_id=$1 AND (NOT $2::boolean OR o.read_at IS NULL)
      ), items AS (
        SELECT * FROM filtered ORDER BY created_at DESC,id DESC LIMIT $3 OFFSET $4
      )
      SELECT COALESCE((SELECT jsonb_agg(to_jsonb(items) ORDER BY created_at DESC,id DESC) FROM items),'[]'::jsonb) AS items,
        (SELECT count(*)::int FROM filtered) AS total,
        (SELECT count(*)::int FROM notification_outbox WHERE user_id=$1 AND read_at IS NULL) AS unread_count`,
    [userId, unreadOnly, limit, (page - 1) * limit]);
    const row = result.rows[0];
    return { items: (row.items as NotificationRecord[]).map(item => presentNotification(item, language)), unreadCount: row.unread_count,
      pagination: { page, limit, total: row.total, totalPages: Math.ceil(row.total / limit) } };
  }

  async markRead(userId: string, id: string) {
    const result = await pool.query(`UPDATE notification_outbox SET read_at=COALESCE(read_at,now())
      WHERE id=$1 AND user_id=$2 RETURNING id,read_at`, [id, userId]);
    if (!result.rowCount) throw new AppError('Không tìm thấy thông báo.', 404, 'NOTIFICATION_NOT_FOUND');
    return { id, readAt: new Date(result.rows[0].read_at).toISOString(), unreadCount: await this.unreadCount(userId) };
  }

  async markAllRead(userId: string, before?: string) {
    const result = await pool.query(`UPDATE notification_outbox SET read_at=now()
      WHERE user_id=$1 AND read_at IS NULL AND created_at<=LEAST(COALESCE($2::timestamptz,now()),now()) RETURNING id`, [userId, before || null]);
    return { updated: result.rowCount || 0, unreadCount: await this.unreadCount(userId) };
  }
}
export const inappNotifications = new InappNotificationRepository();
