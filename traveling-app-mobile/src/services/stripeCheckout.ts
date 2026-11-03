import type { Booking, PaymentPlan } from '../types';
import { apiClient } from './apiClient';
import { storage } from '../utils/storage';

export type StripeAttempt = { payment: { id: string; booking_id: string; provider: string; payment_status: string; expires_at?: string }; clientSecret: string | null };
export async function prepareStripeCheckout(bookingId: string, plan: PaymentPlan): Promise<StripeAttempt> {
  const keyName = `traveling_payment_key_${bookingId}_${plan}`;
  let key = await storage.getItem(keyName);
  if (!key) { key = `checkout_${bookingId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`; await storage.setItem(keyName,key); }
  const {data} = await apiClient.post(`/bookings/${encodeURIComponent(bookingId)}/payments`,{plan},{headers:{'Idempotency-Key':key}});
  const result=data.data;
  if (!data.success || result?.payment?.booking_id!==bookingId || result.payment.provider!=='stripe_test') throw new Error('Không thể mở cổng Stripe test cho đơn này.');
  if (['failed','timed_out'].includes(result.payment.payment_status)) { await storage.removeItem(keyName); throw new Error('Lần thanh toán trước đã kết thúc. Bạn có thể thử lại.'); }
  // Trust the API clock, not a user-adjustable device clock. An expired replay
  // has no client secret; the next explicit retry lets the server reconcile it.
  const expiresAt = Date.parse(result.payment.expires_at || '');
  const serverTime = Date.parse(data.serverTime || '');
  if (result.payment.payment_status === 'pending' && !result.clientSecret && Number.isFinite(expiresAt) && Number.isFinite(serverTime) && expiresAt <= serverTime) {
    await storage.removeItem(keyName);
    throw new Error('Phiên thanh toán đã hết hạn. Kiểm tra trạng thái đơn rồi thử lại.');
  }
  if (result.payment.payment_status!=='succeeded' && !result.clientSecret) throw new Error('Không nhận được phiên thanh toán. Kiểm tra lại trạng thái đơn.');
  return result;
}
export async function verifyStripeCheckout(bookingId: string, paymentId?: string, plan?: PaymentPlan, attempts = 6): Promise<Booking | null> {
  for(let i=0;i<attempts;i++) {
    const {data}=await apiClient.get(`/bookings/${encodeURIComponent(bookingId)}`);
    const b=data.data as Booking;
    if(!data.success || b?.id!==bookingId) throw new Error('Không kiểm tra được trạng thái đặt phòng.');
    const payments=b.payments || [];
    const p=paymentId ? payments.find(p=>p.id===paymentId) : payments.find(p=>p.provider==='stripe_test' && p.payment_status==='succeeded');
    if(['cancelled','expired'].includes(b.booking_status)) throw new Error('Đơn đã hủy hoặc hết hạn. Xem chi tiết để theo dõi thanh toán và hoàn tiền.');
    if(p?.payment_status==='succeeded' && ['confirmed','completed'].includes(b.booking_status) && (plan==='deposit' || Number(b.balance_due)===0)) return b;
    if(p && ['failed','timed_out'].includes(p.payment_status)) throw new Error('Thanh toán chưa thành công. Xem trạng thái trước khi thử lại.');
    if(i+1<attempts) await new Promise(resolve=>setTimeout(resolve,1000+(i*500)));
  }
  return null;
}
