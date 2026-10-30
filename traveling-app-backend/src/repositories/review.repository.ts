import { pool } from '../config/database';
import { AppError } from '../types';

export class ReviewRepository {
  async getEligibility(listingId: string, userId: string) {
    const result = await pool.query(`
      SELECT l.id, l.title,
        EXISTS (SELECT 1 FROM bookings b WHERE b.listing_id = l.id AND b.guest_id = $2 AND b.booking_status = 'completed') AS completed_stay,
        (SELECT json_build_object('id', r.id, 'listing_id', r.listing_id, 'user_id', r.user_id,
          'rating', r.rating, 'comment', r.comment, 'created_at', r.created_at)
          FROM reviews r WHERE r.listing_id = l.id AND r.user_id = $2 LIMIT 1) AS existing_review
      FROM listings l WHERE l.id = $1
    `, [listingId, userId]);
    const row = result.rows[0];
    if (!row) throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');
    return {
      listingId: row.id, listingTitle: row.title,
      canReview: row.completed_stay && !row.existing_review,
      reason: row.existing_review ? 'already_reviewed' : row.completed_stay ? 'eligible' : 'completed_stay_required',
      existingReview: row.existing_review || null,
    };
  }

  async getByListingId(listingId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const countSql = `SELECT COUNT(*) AS total FROM reviews WHERE listing_id = $1`;
    const countRes = await pool.query(countSql, [listingId]);
    const total = parseInt(countRes.rows[0].total, 10);

    const listSql = `
      SELECT 
        r.id, 
        r.listing_id,
        r.rating, 
        r.comment,
        r.created_at,
        r.rating AS cleanliness_rating,
        r.rating AS accuracy_rating,
        r.rating AS checkin_rating,
        r.rating AS communication_rating,
        r.rating AS location_rating,
        r.rating AS value_rating,
        u.id AS user_id, 
        u.full_name AS user_name, 
        u.avatar_url AS user_avatar
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.listing_id = $1
      ORDER BY r.created_at DESC, r.id DESC
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
  }) {
    try {
      const eligible = await pool.query("SELECT 1 FROM bookings WHERE guest_id=$1 AND listing_id=$2 AND booking_status='completed' LIMIT 1", [data.userId,data.listingId]);
      if (!eligible.rows.length) throw new AppError('A completed booking at this accommodation is required',403,'REVIEW_NOT_ELIGIBLE');
      const insertSql = `
        INSERT INTO reviews (
          id, listing_id, user_id, rating, comment, created_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, NOW()
        )
        RETURNING *
      `;
      const insertRes = await pool.query(insertSql, [
        data.listingId,
        data.userId,
        data.rating,
        data.comment,
      ]);

      // Lưu ý: Database đã có trigger trg_rating_after_review tự động tính rating_avg và review_count
      return insertRes.rows[0];
    } catch (error: any) {
      if (error.constraint === 'review_completed_booking') throw new AppError('Completed booking required',403,'REVIEW_NOT_ELIGIBLE');
      if (error.code === '23505') {
        throw new AppError(
          'You have already submitted a review for this accommodation.',
          409,
          'REVIEW_ALREADY_EXISTS'
        );
      }
      throw error;
    }
  }
}

export const reviewRepository = new ReviewRepository();
