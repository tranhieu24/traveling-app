import { pool } from '../config/database';

export class ReviewRepository {
  async getByListingId(listingId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const countSql = `SELECT COUNT(*) AS total FROM reviews WHERE listing_id = $1`;
    const countRes = await pool.query(countSql, [listingId]);
    const total = parseInt(countRes.rows[0].total, 10);

    const listSql = `
      SELECT 
        r.id, r.rating, r.comment,
        r.cleanliness_rating, r.accuracy_rating, r.checkin_rating,
        r.communication_rating, r.location_rating, r.value_rating,
        r.created_at,
        u.id AS user_id, u.full_name AS user_name, u.avatar_url AS user_avatar
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.listing_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const listRes = await pool.query(listSql, [listingId, limit, offset]);

    return {
      items: listRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createReview(data: {
    listingId: string;
    userId: string;
    rating: number;
    comment: string;
    cleanlinessRating?: number;
    accuracyRating?: number;
    checkinRating?: number;
    communicationRating?: number;
    locationRating?: number;
    valueRating?: number;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertSql = `
        INSERT INTO reviews (
          id, listing_id, user_id, rating, comment,
          cleanliness_rating, accuracy_rating, checkin_rating,
          communication_rating, location_rating, value_rating, created_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9, $10, NOW()
        )
        RETURNING *
      `;
      const insertRes = await client.query(insertSql, [
        data.listingId,
        data.userId,
        data.rating,
        data.comment,
        data.cleanlinessRating || 5,
        data.accuracyRating || 5,
        data.checkinRating || 5,
        data.communicationRating || 5,
        data.locationRating || 5,
        data.valueRating || 5,
      ]);

      // Tự động tính toán lại rating_avg & review_count của listing
      const statsSql = `
        SELECT 
          ROUND(AVG(rating)::numeric, 2) AS new_avg,
          COUNT(*) AS new_count
        FROM reviews
        WHERE listing_id = $1
      `;
      const statsRes = await client.query(statsSql, [data.listingId]);
      const { new_avg, new_count } = statsRes.rows[0];

      await client.query(
        `UPDATE listings 
         SET rating_avg = $1, review_count = $2, updated_at = NOW() 
         WHERE id = $3`,
        [new_avg, new_count, data.listingId]
      );

      await client.query('COMMIT');
      return insertRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const reviewRepository = new ReviewRepository();
