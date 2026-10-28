import { randomUUID } from 'crypto';
import { pool } from '../config/database';
import { ENV } from '../config/env';
import { AppError } from '../types';
import { assertTransition, cents, priceStay, today, validateStay } from '../domain/booking';
import { transaction } from '../services/transaction';
import { applyCoupon } from './coupon.repository';
import { PoolClient } from 'pg';

export async function audit(c: PoolClient, actor: string, action: string, entity: string, id: string, before: any, after: any) {
  await c.query('INSERT INTO admin_audit_logs(actor_id,action,entity_type,entity_id,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6)',
    [actor,action,entity,id,JSON.stringify(before),JSON.stringify(after)]);
}
export async function requestRefunds(c: PoolClient, bookingId: string, reason: string) {
  return (await c.query(
    "INSERT INTO refunds(payment_id,booking_id,amount,reason) SELECT id,booking_id,amount,$2 FROM payments WHERE booking_id=$1 AND payment_status='succeeded' AND amount>0 ON CONFLICT(payment_id) DO NOTHING RETURNING *",
    [bookingId,reason])).rows;
}
export async function expireListingHolds(c: PoolClient, listingId: string) {
  const expired = await c.query("UPDATE bookings SET booking_status='expired' WHERE listing_id=$1 AND booking_status='pending' AND payment_due_at<=now() RETURNING id",[listingId]);
  if (expired.rows.length) await c.query("UPDATE payments SET payment_status='timed_out',updated_at=now() WHERE booking_id=ANY($1::uuid[]) AND payment_status='pending'",[expired.rows.map(b=>b.id)]);
}

const bookingSelect = `SELECT b.*, (b.price_per_night*b.total_nights) AS base_price_total,
  b.price_per_night AS nightly_rate, b.total_price AS trip_total,
  l.title listing_title,l.city listing_city,l.country listing_country,l.address listing_address,
  l.property_type,l.host_id,u.full_name guest_name,u.email guest_email,lp.photo_url cover_photo,
  coalesce(p.paid,0)::numeric(12,2) amount_paid,coalesce(r.refunded,0)::numeric(12,2) amount_refunded,
  (coalesce(p.paid,0)-coalesce(r.refunded,0))::numeric(12,2) net_paid,
  CASE WHEN b.booking_status IN ('cancelled','expired') THEN 0 ELSE greatest(b.total_price-coalesce(p.paid,0)+coalesce(r.refunded,0),0) END::numeric(12,2) balance_due,
  CASE WHEN coalesce(p.paid,0)>0 AND coalesce(r.refunded,0)>=p.paid THEN 'refunded'
    WHEN coalesce(p.paid,0)>=b.total_price AND coalesce(p.n,0)>0 THEN 'paid'
    WHEN coalesce(p.paid,0)>0 THEN 'partially_paid' ELSE 'pending' END payment_status,
  coalesce(p.transactions,'[]'::jsonb) payments,coalesce(r.refunds,'[]'::jsonb) refunds
 FROM bookings b JOIN listings l ON l.id=b.listing_id JOIN users u ON u.id=b.guest_id
 LEFT JOIN LATERAL (SELECT photo_url FROM listing_photos WHERE listing_id=l.id ORDER BY is_cover DESC,display_order,id LIMIT 1) lp ON true
 LEFT JOIN LATERAL (SELECT sum(amount) FILTER(WHERE payment_status='succeeded') paid,
   count(*) FILTER(WHERE payment_status='succeeded') n,jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id) transactions FROM payments x WHERE booking_id=b.id) p ON true
 LEFT JOIN LATERAL (SELECT sum(amount) FILTER(WHERE status='succeeded') refunded,jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id) refunds FROM refunds x WHERE booking_id=b.id) r ON true`;

export class BookingRepository {
  async quoteBooking(listingId: string, checkInDate: string, checkOutDate: string, guests: number, couponCode?: string, userId?: string) {
    const nights = validateStay(checkInDate,checkOutDate,guests);
    return transaction(async c => {
      const listing = (await c.query("SELECT l.*,lp.photo_url cover_photo FROM listings l JOIN categories cat ON cat.id=l.category_id LEFT JOIN LATERAL (SELECT photo_url FROM listing_photos WHERE listing_id=l.id ORDER BY is_cover DESC,display_order,id LIMIT 1) lp ON true WHERE l.id=$1 AND l.is_active AND cat.is_active",[listingId])).rows[0];
      if (!listing) throw new AppError('Listing unavailable',404,'LISTING_NOT_FOUND');
      validateStay(checkInDate,checkOutDate,guests,listing.max_guests);
      const conflicts = await c.query("SELECT 1 FROM bookings WHERE listing_id=$1 AND (booking_status='confirmed' OR (booking_status='pending' AND payment_due_at>now())) AND check_in_date<$2::date AND check_out_date>$3::date",[listingId,checkOutDate,checkInDate]);
      if (conflicts.rows.length) throw new AppError('Selected dates unavailable',409,'DATES_UNAVAILABLE');
      const coupon = await applyCoupon(c,couponCode,listing,userId,cents(listing.price_per_night)*nights);
      const price = priceStay(listing,nights,coupon.discountCents,ENV.TAX_RATE);
      return {...price,listingId,title:listing.title,city:listing.city,coverPhoto:listing.cover_photo,checkInDate,checkOutDate,guests,maxGuests:listing.max_guests,
        pricePerNight:price.nightlyRate,basePriceTotal:price.roomSubtotal,totalPrice:price.tripTotal,quoteIsReservation:false};
    });
  }

  async createBookingWithTransaction(data: {listingId:string;guestId:string;checkInDate:string;checkOutDate:string;guests:number;specialRequests?:string;paymentPlan?:string;couponCode?:string}) {
    const nights = validateStay(data.checkInDate,data.checkOutDate,data.guests);
    try { return await transaction(async c => {
      const listing = (await c.query("SELECT * FROM listings WHERE id=$1 AND is_active FOR UPDATE",[data.listingId])).rows[0];
      if (!listing) throw new AppError('Listing unavailable',404,'LISTING_NOT_FOUND');
      const category = (await c.query('SELECT is_active FROM categories WHERE id=$1 FOR SHARE',[listing.category_id])).rows[0];
      if (!category?.is_active) throw new AppError('Listing category inactive',409,'LISTING_NOT_AVAILABLE');
      validateStay(data.checkInDate,data.checkOutDate,data.guests,listing.max_guests);
      await expireListingHolds(c,data.listingId);
      const conflicts = await c.query("SELECT 1 FROM bookings WHERE listing_id=$1 AND booking_status IN ('pending','confirmed') AND check_in_date<$2::date AND check_out_date>$3::date",[data.listingId,data.checkOutDate,data.checkInDate]);
      if (conflicts.rows.length) throw new AppError('Dates already booked',409,'DATES_ALREADY_BOOKED');
      const coupon = await applyCoupon(c,data.couponCode,listing,data.guestId,cents(listing.price_per_night)*nights,true);
      const p = priceStay(listing,nights,coupon.discountCents,ENV.TAX_RATE);
      if (p.tripTotal<=0) throw new AppError('Zero-total bookings require a separate complimentary workflow',400,'INVALID_AMOUNT');
      const b = (await c.query(
        "INSERT INTO bookings(booking_code,listing_id,guest_id,check_in_date,check_out_date,number_of_guests,price_per_night,cleaning_fee,service_fee,total_price,discount_amount,tax_amount,tax_rate,coupon_id,payment_plan,payment_due_at,special_requests) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now()+make_interval(mins=>$16),$17) RETURNING *",
        ['TRV-'+randomUUID().replace(/-/g,'').slice(0,16),data.listingId,data.guestId,data.checkInDate,data.checkOutDate,data.guests,p.nightlyRate,p.cleaningFee,p.serviceFee,p.tripTotal,p.discountAmount,p.taxAmount,p.taxRate,coupon.couponId,data.paymentPlan||'full',ENV.PAYMENT_HOLD_MINUTES,data.specialRequests||null])).rows[0];
      if (coupon.couponId) {
        await c.query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1',[coupon.couponId]);
        await c.query('INSERT INTO coupon_redemptions(booking_id,coupon_id,user_id) VALUES($1,$2,$3)',[b.id,coupon.couponId,data.guestId]);
      }
      return {booking:{...b,nightly_rate:p.nightlyRate,trip_total:p.tripTotal,amount_paid:0,balance_due:p.tripTotal,payment_status:'pending'},payment:null};
    }); } catch(e: any) {
      if (e.code==='23P01') throw new AppError('Dates already booked',409,'DATES_ALREADY_BOOKED');
      throw e;
    }
  }

  async getUserBookings(userId: string, status='all', page=1, limit=12) {
    const condition = "b.guest_id=$1 AND ($2='all' OR b.booking_status=$2)";
    const count = await pool.query('SELECT count(*)::int n FROM bookings b WHERE '+condition,[userId,status]);
    const rows = await pool.query(bookingSelect+' WHERE '+condition+' ORDER BY b.created_at DESC,b.id LIMIT $3 OFFSET $4',[userId,status,limit,(page-1)*limit]);
    return {items:rows.rows,total:count.rows[0].n,page,limit,totalPages:Math.ceil(count.rows[0].n/limit)};
  }
  async getBookingDetail(id: string, userId: string, admin=false) {
    return (await pool.query(bookingSelect+' WHERE b.id=$1 AND (b.guest_id=$2 OR l.host_id=$2 OR $3)',[id,userId,admin])).rows[0]||null;
  }
  async cancelBooking(id: string, userId: string, reason='Cancelled by guest', admin=false) {
    return transaction(async c => {
      const b = (await c.query('SELECT * FROM bookings WHERE id=$1 AND (guest_id=$2 OR $3) FOR UPDATE',[id,userId,admin])).rows[0];
      if (!b) throw new AppError('Booking not found',404,'BOOKING_NOT_FOUND');
      assertTransition('booking',b.booking_status,'cancelled');
      if (b.booking_status==='confirmed' && b.check_in_date<=today()) throw new AppError('Cancellation must be requested before check-in date (UTC)',409,'CANCELLATION_WINDOW_CLOSED');
      const result = (await c.query("UPDATE bookings SET booking_status='cancelled',cancelled_at=now(),cancellation_reason=$2 WHERE id=$1 RETURNING *",[id,reason])).rows[0];
      await c.query("UPDATE payments SET payment_status='timed_out',updated_at=now() WHERE booking_id=$1 AND payment_status='pending'",[id]);
      const refunds = await requestRefunds(c,id,reason);
      if (admin) await audit(c,userId,'booking.cancel','booking',id,b,result);
      return {booking:result,refunds,message:'Cancellation recorded. Refunds require approval and provider confirmation.'};
    });
  }
  async transitionBooking(id: string, actorId: string, target: 'confirmed'|'completed') {
    return transaction(async c => {
      const b = (await c.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if (!b) throw new AppError('Booking not found',404,'BOOKING_NOT_FOUND');
      assertTransition('booking',b.booking_status,target);
      const paid = (await c.query("SELECT coalesce(sum(amount),0) paid FROM payments WHERE booking_id=$1 AND payment_status='succeeded'",[id])).rows[0];
      const refunded = (await c.query("SELECT coalesce(sum(amount),0) refunded FROM refunds WHERE booking_id=$1 AND status='succeeded'",[id])).rows[0];
      const net = cents(paid.paid)-cents(refunded.refunded);
      const required = target==='completed' || b.payment_plan==='full' ? cents(b.total_price) : Math.min(3000,cents(b.total_price));
      if (net<required) throw new AppError('Insufficient verified payment',409,'PAYMENT_REQUIRED');
      if (target==='confirmed' && (!b.payment_due_at || new Date(b.payment_due_at).getTime()<=Date.now())) throw new AppError('Payment hold expired',409,'BOOKING_EXPIRED');
      if (target==='completed' && b.check_out_date>today()) throw new AppError('Cannot complete before check-out date (UTC)',409,'STAY_NOT_ENDED');
      const result = (await c.query("UPDATE bookings SET booking_status=$2::text,payment_due_at=NULL,completed_at=CASE WHEN $2::text='completed' THEN now() ELSE completed_at END WHERE id=$1 RETURNING *",[id,target])).rows[0];
      await audit(c,actorId,'booking.'+target,'booking',id,b,result);
      return result;
    });
  }
  async expirePending() {
    return transaction(async c => {
      const ids = (await c.query("SELECT b.id FROM bookings b WHERE (b.booking_status='pending' AND b.payment_due_at<=now()) OR EXISTS(SELECT 1 FROM payments p WHERE p.booking_id=b.id AND p.payment_status='pending' AND p.expires_at<=now()) ORDER BY b.id FOR UPDATE SKIP LOCKED LIMIT 500")).rows.map(r=>r.id);
      if (!ids.length) return {expired:0,paymentsTimedOut:0};
      const expired=await c.query("UPDATE bookings SET booking_status='expired' WHERE id=ANY($1::uuid[]) AND booking_status='pending' AND payment_due_at<=now() RETURNING id",[ids]);
      const payments=await c.query("UPDATE payments SET payment_status='timed_out',updated_at=now() WHERE booking_id=ANY($1::uuid[]) AND payment_status='pending' AND expires_at<=now() RETURNING id",[ids]);
      return {expired:expired.rows.length,paymentsTimedOut:payments.rows.length};
    });
  }
}
export const bookingRepository = new BookingRepository();
