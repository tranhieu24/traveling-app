import { pool } from '../config/database';

export class FavoriteRepository {
  async getUserFavorites(userId: string) {
    const sql = `
      SELECT 
        l.id, l.title, l.property_type, l.room_type,
        l.city, l.state_province, l.country, l.region,
        l.price_per_night, l.cleaning_fee, l.service_fee,
        l.rating_avg, l.review_count,
        c.name AS category_name,
        lp.photo_url AS cover_photo,
        true AS is_favorite,
        f.created_at AS favorited_at
      FROM favorites f
      INNER JOIN listings l ON l.id = f.listing_id
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN LATERAL (
        SELECT photo_url 
        FROM listing_photos 
        WHERE listing_id = l.id 
        ORDER BY is_cover DESC, display_order ASC 
        LIMIT 1
      ) lp ON true
      WHERE f.user_id = $1 AND l.is_active = true
      ORDER BY f.created_at DESC
    `;
    const result = await pool.query(sql, [userId]);
    return result.rows;
  }

  async toggleFavorite(userId: string, listingId: string): Promise<boolean> {
    const checkSql = `SELECT id FROM favorites WHERE user_id = $1 AND listing_id = $2`;
    const checkRes = await pool.query(checkSql, [userId, listingId]);

    if (checkRes.rows.length > 0) {
      await pool.query(`DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2`, [userId, listingId]);
      return false;
    } else {
      await pool.query(
        `INSERT INTO favorites (id, user_id, listing_id, created_at) VALUES (gen_random_uuid(), $1, $2, NOW())`,
        [userId, listingId]
      );
      return true;
    }
  }
}

export const favoriteRepository = new FavoriteRepository();
