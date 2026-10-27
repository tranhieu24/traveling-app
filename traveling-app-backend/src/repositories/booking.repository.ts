import { pool } from '../config/database';
import { AppError } from '../types';

export interface BookingQuoteResult {
  listingId: string;
  pricePerNight: number;
  totalNights: number;
  basePriceTotal: number;
  cleaningFee: number;
  serviceFee: number;
  totalPrice: number;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  maxGuests: number;
  title: string;
  city: string;
  coverPhoto: string | null;
}

export class BookingRepository {
  calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  async quoteBooking(
    listingId: string,
    checkInDate: string,
    checkOutDate: string,
    guests: number
  ): Promise<BookingQuoteResult> {
    const totalNights = this.calculateNights(checkInDate, checkOutDate);
    if (totalNights <= 0) {
      throw new AppError('Check-out date must be after check-in date', 400, 'INVALID_DATES');
    }

    const listingSql = `
      SELECT 
        l.id, l.title, l.city, l.price_per_night, l.cleaning_fee, l.service_fee, l.max_guests,
        lp.photo_url AS cover_photo
      FROM listings l
      LEFT JOIN LATERAL (
        SELECT photo_url 
        FROM listing_photos 
        WHERE listing_id = l.id 
        ORDER BY is_cover DESC, display_order ASC 
        LIMIT 1
      ) lp ON true
      WHERE l.id = $1 AND l.is_active = true
    `;
    const listingRes = await pool.query(listingSql, [listingId]);
    if (listingRes.rows.length === 0) {
      throw new AppError('Listing not found or inactive', 404, 'LISTING_NOT_FOUND');
    }

    const listing = listingRes.rows[0];
    if (guests > listing.max_guests) {
      throw new AppError(
        `Number of guests (${guests}) exceeds maximum allowed (${listing.max_guests})`,
        400,
        'MAX_GUESTS_EXCEEDED'
      );
    }

    // Kiểm tra xem khoảng ngày này có bị trùng với đơn khác không
    const overlapSql = `
      SELECT id FROM bookings 
      WHERE listing_id = $1 
        AND booking_status IN ('confirmed', 'pending') 
        AND (check_in_date < $2::date AND check_out_date > $3::date)
      LIMIT 1
    `;
    const overlapRes = await pool.query(overlapSql, [listingId, checkOutDate, checkInDate]);
    if (overlapRes.rows.length > 0) {
      throw new AppError(
        'The selected dates are already booked. Please choose different dates.',
        409,
        'DATES_UNAVAILABLE'
      );
    }

    const pricePerNight = parseFloat(listing.price_per_night);
    const cleaningFee = parseFloat(listing.cleaning_fee || '0');
    const serviceFee = parseFloat(listing.service_fee || '0');
    const basePriceTotal = parseFloat((pricePerNight * totalNights).toFixed(2));
    const totalPrice = parseFloat((basePriceTotal + cleaningFee + serviceFee).toFixed(2));

    return {
      listingId: listing.id,
      title: listing.title,
      city: listing.city,
      coverPhoto: listing.cover_photo,
      pricePerNight,
      totalNights,
      basePriceTotal,
      cleaningFee,
      serviceFee,
      totalPrice,
      checkInDate,
      checkOutDate,
      guests,
      maxGuests: listing.max_guests,
    };
  }

  async createBookingWithTransaction(data: {
    listingId: string;
    guestId: string;
    checkInDate: string;
    checkOutDate: string;
    guests: number;
    specialRequests?: string;
    paymentMethod: string;
    mockCardLast4: string;
  }) {
    const totalNights = this.calculateNights(data.checkInDate, data.checkOutDate);
    if (totalNights <= 0) {
      throw new AppError('Check-out date must be after check-in date', 400, 'INVALID_DATES');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Khóa và lấy thông tin Listing
      const listingRes = await client.query(
        `SELECT id, title, price_per_night, cleaning_fee, service_fee, max_guests 
         FROM listings 
         WHERE id = $1 AND is_active = true 
         FOR UPDATE`,
        [data.listingId]
      );

      if (listingRes.rows.length === 0) {
        throw new AppError('Listing not found or no longer available', 404, 'LISTING_NOT_FOUND');
      }

      const listing = listingRes.rows[0];
      if (data.guests > listing.max_guests) {
        throw new AppError(
          `Number of guests exceeds max allowed (${listing.max_guests})`,
          400,
          'MAX_GUESTS_EXCEEDED'
        );
      }

      // 2. CHỐNG OVERBOOKING VỚI TRANSACTION VÀ SELECT FOR UPDATE
      const conflictRes = await client.query(
        `SELECT id FROM bookings 
         WHERE listing_id = $1 
           AND booking_status IN ('confirmed', 'pending') 
           AND (check_in_date < $2::date AND check_out_date > $3::date) 
         FOR UPDATE`,
        [data.listingId, data.checkOutDate, data.checkInDate]
      );

      if (conflictRes.rows.length > 0) {
        throw new AppError(
          'Conflict detected: The selected dates have just been reserved by another traveler.',
          409,
          'DATES_ALREADY_BOOKED'
        );
      }

      // 3. Tính toán giá tiền
      const pricePerNight = parseFloat(listing.price_per_night);
      const cleaningFee = parseFloat(listing.cleaning_fee || '0');
      const serviceFee = parseFloat(listing.service_fee || '0');
      const basePriceTotal = parseFloat((pricePerNight * totalNights).toFixed(2));
      const totalPrice = parseFloat((basePriceTotal + cleaningFee + serviceFee).toFixed(2));

      // 4. Sinh mã Booking Code ngẫu nhiên duy nhất
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      const bookingCode = `BK-${randomPart}`;

      // 5. Thêm Booking mới
      const insertBookingSql = `
        INSERT INTO bookings (
          id, booking_code, listing_id, guest_id, check_in_date, check_out_date,
          total_nights, number_of_guests, base_price_total, cleaning_fee, service_fee, total_price,
          booking_status, payment_status, special_requests, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4::date, $5::date,
          $6, $7, $8, $9, $10, $11,
          'confirmed', 'paid', $12, NOW(), NOW()
        )
        RETURNING *
      `;
      const bookingRes = await client.query(insertBookingSql, [
        bookingCode,
        data.listingId,
        data.guestId,
        data.checkInDate,
        data.checkOutDate,
        totalNights,
        data.guests,
        basePriceTotal,
        cleaningFee,
        serviceFee,
        totalPrice,
        data.specialRequests || null,
      ]);
      const createdBooking = bookingRes.rows[0];

      // 6. Thêm bản ghi Payment (Giả lập thanh toán thành công)
      const txnRef = `TXN-${Date.now()}-${randomPart}`;
      const insertPaymentSql = `
        INSERT INTO payments (
          id, booking_id, user_id, amount, currency, payment_method,
          payment_status, transaction_reference, mock_card_last4, paid_at, created_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, 'USD', $4,
          'succeeded', $5, $6, NOW(), NOW()
        )
        RETURNING *
      `;
      const paymentRes = await client.query(insertPaymentSql, [
        createdBooking.id,
        data.guestId,
        totalPrice,
        data.paymentMethod,
        txnRef,
        data.mockCardLast4,
      ]);
      const createdPayment = paymentRes.rows[0];

      await client.query('COMMIT');

      return {
        booking: createdBooking,
        payment: createdPayment,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserBookings(guestId: string, status?: string) {
    const conditions = ['b.guest_id = $1'];
    const values: any[] = [guestId];

    if (status && status !== 'all') {
      conditions.push('b.booking_status = $2');
      values.push(status);
    }

    const sql = `
      SELECT 
        b.*,
        l.title AS listing_title,
        l.city AS listing_city,
        l.country AS listing_country,
        l.property_type,
        lp.photo_url AS cover_photo
      FROM bookings b
      JOIN listings l ON l.id = b.listing_id
      LEFT JOIN LATERAL (
        SELECT photo_url 
        FROM listing_photos 
        WHERE listing_id = l.id 
        ORDER BY is_cover DESC, display_order ASC 
        LIMIT 1
      ) lp ON true
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.created_at DESC
    `;
    const result = await pool.query(sql, values);
    return result.rows;
  }

  async getBookingDetail(bookingId: string, userId: string) {
    const sql = `
      SELECT 
        b.*,
        l.title AS listing_title,
        l.description AS listing_description,
        l.address AS listing_address,
        l.city AS listing_city,
        l.country AS listing_country,
        l.latitude AS listing_latitude,
        l.longitude AS listing_longitude,
        l.price_per_night,
        u_host.full_name AS host_name,
        u_host.avatar_url AS host_avatar,
        u_host.phone_number AS host_phone,
        u_guest.full_name AS guest_name,
        u_guest.email AS guest_email,
        lp.photo_url AS cover_photo,
        p.transaction_reference,
        p.payment_status AS detailed_payment_status,
        p.payment_method,
        p.mock_card_last4,
        p.paid_at
      FROM bookings b
      JOIN listings l ON l.id = b.listing_id
      JOIN users u_host ON u_host.id = l.host_id
      JOIN users u_guest ON u_guest.id = b.guest_id
      LEFT JOIN payments p ON p.booking_id = b.id
      LEFT JOIN LATERAL (
        SELECT photo_url 
        FROM listing_photos 
        WHERE listing_id = l.id 
        ORDER BY is_cover DESC, display_order ASC 
        LIMIT 1
      ) lp ON true
      WHERE b.id = $1 AND (b.guest_id = $2 OR l.host_id = $2)
    `;
    const res = await pool.query(sql, [bookingId, userId]);
    return res.rows[0] || null;
  }

  async cancelBooking(bookingId: string, userId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const bookingRes = await client.query(
        `SELECT b.* FROM bookings b 
         JOIN listings l ON l.id = b.listing_id 
         WHERE b.id = $1 AND (b.guest_id = $2 OR l.host_id = $2)
         FOR UPDATE`,
        [bookingId, userId]
      );

      if (bookingRes.rows.length === 0) {
        throw new AppError('Booking not found or unauthorized to cancel', 404, 'BOOKING_NOT_FOUND');
      }

      const booking = bookingRes.rows[0];
      if (booking.booking_status === 'cancelled') {
        throw new AppError('Booking is already cancelled', 400, 'ALREADY_CANCELLED');
      }

      // Cập nhật trạng thái booking thành cancelled
      const updateBooking = await client.query(
        `UPDATE bookings 
         SET booking_status = 'cancelled', payment_status = 'refunded', updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [bookingId]
      );

      // Cập nhật trạng thái payment thành refunded
      await client.query(
        `UPDATE payments 
         SET payment_status = 'refunded' 
         WHERE booking_id = $1`,
        [bookingId]
      );

      await client.query('COMMIT');
      return updateBooking.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const bookingRepository = new BookingRepository();
