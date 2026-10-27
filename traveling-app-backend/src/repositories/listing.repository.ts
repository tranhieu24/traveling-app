import { pool } from '../config/database';

export interface ListingFilterParams {
  categoryId?: string;
  region?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  amenityIds?: string[];
  checkIn?: string;
  checkOut?: string;
  page: number;
  limit: number;
  sortBy: 'recommended' | 'price_asc' | 'price_desc' | 'rating';
  userId?: string;
}

export class ListingRepository {
  async findListings(filters: ListingFilterParams) {
    const conditions: string[] = ['l.is_active = true'];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.categoryId) {
      conditions.push(`l.category_id = $${paramIndex++}`);
      values.push(filters.categoryId);
    }

    if (filters.region) {
      conditions.push(`LOWER(l.region) = LOWER($${paramIndex++})`);
      values.push(filters.region);
    }

    if (filters.city) {
      conditions.push(`LOWER(l.city) LIKE LOWER($${paramIndex++})`);
      values.push(`%${filters.city}%`);
    }

    if (filters.minPrice !== undefined) {
      conditions.push(`l.price_per_night >= $${paramIndex++}`);
      values.push(filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      conditions.push(`l.price_per_night <= $${paramIndex++}`);
      values.push(filters.maxPrice);
    }

    if (filters.guests !== undefined) {
      conditions.push(`l.max_guests >= $${paramIndex++}`);
      values.push(filters.guests);
    }

    if (filters.bedrooms !== undefined) {
      conditions.push(`l.bedrooms >= $${paramIndex++}`);
      values.push(filters.bedrooms);
    }

    if (filters.beds !== undefined) {
      conditions.push(`l.beds >= $${paramIndex++}`);
      values.push(filters.beds);
    }

    if (filters.bathrooms !== undefined) {
      conditions.push(`l.bathrooms >= $${paramIndex++}`);
      values.push(filters.bathrooms);
    }

    // Lọc theo khoảng ngày check-in / check-out: LOẠI TRỪ các listing đã có booking còn hiệu lực trùng lịch
    if (filters.checkIn && filters.checkOut) {
      const checkInIndex = paramIndex++;
      const checkOutIndex = paramIndex++;
      values.push(filters.checkIn, filters.checkOut);

      conditions.push(`NOT EXISTS (
        SELECT 1 FROM bookings b 
        WHERE b.listing_id = l.id 
          AND b.booking_status IN ('confirmed', 'pending')
          AND (b.check_in_date < $${checkOutIndex}::date AND b.check_out_date > $${checkInIndex}::date)
      )`);
    }

    // Lọc theo mảng tiện nghi (Listing phải có đủ TẤT CẢ các amenityIds truyền vào)
    if (filters.amenityIds && filters.amenityIds.length > 0) {
      const amenityIndex = paramIndex++;
      values.push(filters.amenityIds);
      conditions.push(`(
        SELECT COUNT(DISTINCT la.amenity_id) 
        FROM listing_amenities la 
        WHERE la.listing_id = l.id AND la.amenity_id = ANY($${amenityIndex}::uuid[])
      ) = ${filters.amenityIds.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sắp xếp
    let orderClause = 'ORDER BY l.created_at DESC';
    if (filters.sortBy === 'price_asc') {
      orderClause = 'ORDER BY l.price_per_night ASC';
    } else if (filters.sortBy === 'price_desc') {
      orderClause = 'ORDER BY l.price_per_night DESC';
    } else if (filters.sortBy === 'rating') {
      orderClause = 'ORDER BY l.rating_avg DESC NULLS LAST, l.review_count DESC';
    }

    // Đếm tổng số bản ghi
    const countSql = `
      SELECT COUNT(*) AS total
      FROM listings l
      ${whereClause}
    `;
    const countResult = await pool.query(countSql, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Phân trang
    const offset = (filters.page - 1) * filters.limit;
    const limitIndex = paramIndex++;
    const offsetIndex = paramIndex++;
    values.push(filters.limit, offset);

    // User id nếu có để kiểm tra is_favorite
    let favoriteSelect = 'false AS is_favorite';
    if (filters.userId) {
      const userFavIndex = paramIndex++;
      values.push(filters.userId);
      favoriteSelect = `EXISTS (
        SELECT 1 FROM favorites fav 
        WHERE fav.listing_id = l.id AND fav.user_id = $${userFavIndex}
      ) AS is_favorite`;
    }

    const listingsSql = `
      SELECT 
        l.id, l.title, l.description, l.property_type, l.room_type,
        l.address, l.city, NULL::text AS state_province, l.country, l.region,
        l.latitude, l.longitude,
        l.price_per_night, l.cleaning_fee, l.service_fee,
        l.max_guests, l.bedrooms, l.beds, l.bathrooms,
        l.check_in_time, l.check_out_time,
        l.rating_avg, l.review_count, l.is_active,
        c.name AS category_name, c.slug AS category_slug,
        lp.photo_url AS cover_photo,
        ${favoriteSelect}
      FROM listings l
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN LATERAL (
        SELECT photo_url 
        FROM listing_photos 
        WHERE listing_id = l.id 
        ORDER BY is_cover DESC, display_order ASC 
        LIMIT 1
      ) lp ON true
      ${whereClause}
      ${orderClause}
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await pool.query(listingsSql, values);

    return {
      items: result.rows,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  async getListingById(id: string, userId?: string) {
    let favSelect = 'false AS is_favorite';
    const params: any[] = [id];
    if (userId) {
      params.push(userId);
      favSelect = `EXISTS (SELECT 1 FROM favorites WHERE listing_id = l.id AND user_id = $2) AS is_favorite`;
    }

    const listingSql = `
      SELECT 
        l.*,
        NULL::text AS state_province,
        c.name AS category_name, c.slug AS category_slug,
        u.full_name AS host_name, u.avatar_url AS host_avatar, u.email AS host_email, u.phone_number AS host_phone,
        ${favSelect}
      FROM listings l
      LEFT JOIN categories c ON c.id = l.category_id
      LEFT JOIN users u ON u.id = l.host_id
      WHERE l.id = $1 AND l.is_active = true
    `;
    const listingRes = await pool.query(listingSql, params);
    if (listingRes.rows.length === 0) return null;

    const listing = listingRes.rows[0];

    // Lấy photos từ listing_photos (schema.sql)
    const photosSql = `
      SELECT id, listing_id, photo_url, caption, display_order, is_cover 
      FROM listing_photos 
      WHERE listing_id = $1 
      ORDER BY is_cover DESC, display_order ASC
    `;
    const photosRes = await pool.query(photosSql, [id]);
    listing.photos = photosRes.rows;

    // Lấy amenities từ listing_amenities + amenities (schema.sql)
    const amenitiesSql = `
      SELECT 
        a.id, 
        a.name, 
        a.icon_name, 
        a.icon_name AS icon, 
        a.group_name, 
        a.group_name AS category
      FROM amenities a
      INNER JOIN listing_amenities la ON la.amenity_id = a.id
      WHERE la.listing_id = $1
      ORDER BY a.group_name ASC, a.name ASC
    `;
    const amenitiesRes = await pool.query(amenitiesSql, [id]);
    listing.amenities = amenitiesRes.rows;

    return listing;
  }
}

export const listingRepository = new ListingRepository();
