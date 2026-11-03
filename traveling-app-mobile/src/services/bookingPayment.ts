import axios from 'axios';
import type { Booking, BookingPayment, PaymentPlan } from '../types';
import { apiClient } from './apiClient';
import { storage } from '../utils/storage';
import { getPaymentSummary } from '../utils/paymentSummary';

const inFlight = new Map<string, Promise<Booking>>();
const isExpired = (value?: string | null, serverTime?: string): boolean => !!value && !!serverTime && Date.parse(value) <= Date.parse(serverTime);

const readBooking = async (bookingId: string): Promise<Booking> => {
  const response = await apiClient.get(`/bookings/${encodeURIComponent(bookingId)}`);
  if (!response.data.success || response.data.data?.id !== bookingId) throw new Error('Chưa xác minh được đơn đặt phòng. Vui lòng thử lại.');
  return response.data.data;
};

const runPayment = async (bookingId: string, requestedPlan?: PaymentPlan): Promise<Booking> => {
  const booking = await readBooking(bookingId);
  let serverTime = booking.server_time;
  const planSatisfied=Number(booking.balance_due ?? booking.total_price)===0 || ((requestedPlan || booking.payment_plan)==='deposit' && Number(booking.amount_paid||0)>0);
  if (getPaymentSummary(booking).state === 'success' && planSatisfied) return booking;
  if (requestedPlan === 'balance' && (Number(booking.amount_paid || 0) <= 0 || Number(booking.balance_due || 0) <= 0)) throw new Error('Đơn không có phần còn lại cần thanh toán sau cọc.');
  if (!['pending', 'confirmed'].includes(booking.booking_status)) throw new Error('Đơn chưa thể nhận thanh toán. Vui lòng kiểm tra trạng thái đặt phòng.');
  if (booking.booking_status === 'pending' && isExpired(booking.payment_due_at, serverTime)) throw new Error('Đơn đã hết thời hạn giữ phòng. Vui lòng chọn lịch và đặt lại.');

  const plan = requestedPlan || (booking.payment_plan === 'deposit' ? 'deposit' : 'full');
  const keyName = `traveling_payment_key_${bookingId}_${plan}`;
  let payment: BookingPayment | undefined = booking.payments?.find((entry) => entry.payment_status === 'pending' && !isExpired(entry.expires_at, serverTime));

  if (payment?.requested_plan && payment.requested_plan !== plan) throw new Error('Đang có lần thanh toán chờ xử lý. Kiểm tra trạng thái trước khi chọn cách thanh toán khác.');

  if (!payment) {
    let key = await storage.getItem(keyName);
    const previous = key ? booking.payments?.find((entry) => entry.idempotency_key === key) : undefined;
    if (previous && (previous.payment_status !== 'pending' || isExpired(previous.expires_at, serverTime))) key = null;
    if (!key) {
      key = `checkout_${bookingId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      await storage.setItem(keyName, key);
    }
    const response = await apiClient.post(`/bookings/${encodeURIComponent(bookingId)}/payments`, { plan }, { headers: { 'Idempotency-Key': key } });
    const result = response.data.data;
    serverTime = response.data.serverTime || serverTime;
    if (!response.data.success || !result?.payment?.id) throw new Error('Chưa khởi tạo được thanh toán. Vui lòng thử lại.');
    payment = result.payment as BookingPayment;
    if (!result.simulation || payment.provider !== 'mock' || payment.is_simulated !== true) {
      throw new Error('Chế độ này chỉ hỗ trợ thanh toán mô phỏng. Vui lòng tải lại thông tin cổng thanh toán.');
    }
  }

  if (payment.requested_plan && payment.requested_plan !== plan) throw new Error('Hình thức trả tiền không khớp yêu cầu. Vui lòng kiểm tra lại.');
  if (payment.booking_id && payment.booking_id !== bookingId) throw new Error('Giao dịch không thuộc đơn đặt phòng này.');
  if (payment.payment_status === 'pending') {
    if (payment.provider !== 'mock' || payment.is_simulated !== true) throw new Error('Vui lòng tiếp tục tại cổng thanh toán của giao dịch này. Không thể dùng mô phỏng.');
    if (isExpired(payment.expires_at, serverTime)) throw new Error('Phiên thanh toán đã hết hạn. Vui lòng thử lại.');
    const response = await apiClient.post(`/payments/${encodeURIComponent(payment.id)}/simulate`, { outcome: 'succeeded' });
    if (!response.data.success) throw new Error('Chưa hoàn tất thanh toán. Kiểm tra đơn đặt phòng trước khi thử lại.');
  } else if (payment.payment_status !== 'succeeded') {
    await storage.removeItem(keyName);
    throw new Error('Lần thanh toán này chưa thành công. Vui lòng thử lại.');
  }

  const paymentId = payment.id;
  const updated = await readBooking(bookingId);
  const verifiedPayment = updated.payments?.find((entry) => entry.id === paymentId && entry.payment_status === 'succeeded');
  if (!verifiedPayment || getPaymentSummary(updated).state !== 'success') throw new Error('Thanh toán chưa được xác nhận. Vui lòng kiểm tra trạng thái đặt phòng.');
  await storage.removeItem(keyName);
  return updated;
};

// Share a single request chain across repeated taps on this booking.
export const completeBookingPayment = (bookingId: string, plan?: PaymentPlan): Promise<Booking> => {
  const pending = inFlight.get(bookingId);
  if (pending) return pending;
  const task = runPayment(bookingId, plan).finally(() => { inFlight.delete(bookingId); });
  inFlight.set(bookingId, task);
  return task;
};

const paymentMessages:Record<string,string>={
  AUTH_REQUIRED:'Vui lòng đăng nhập để tiếp tục.',INVALID_TOKEN:'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',TOKEN_EXPIRED:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',SESSION_REVOKED:'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.',
  ACCOUNT_BLOCKED:'Tài khoản đang bị khóa. Vui lòng liên hệ hỗ trợ.',DATES_ALREADY_BOOKED:'Lịch này vừa được đặt. Vui lòng chọn ngày khác.',DATES_UNAVAILABLE:'Chỗ ở không còn trống trong lịch đã chọn.',MAX_GUESTS_EXCEEDED:'Số khách vượt sức chứa của chỗ ở.',
  BOOKING_EXPIRED:'Đơn đã hết thời hạn giữ phòng. Vui lòng chọn lịch và đặt lại.',PAYMENTS_DISABLED:'Cổng thanh toán chưa được cấu hình. Đơn chưa được thanh toán.',PROVIDER_UNAVAILABLE:'Chưa xác minh được kết quả từ cổng thanh toán. Kiểm tra trạng thái trước khi thử lại.',PAYMENT_IN_PROGRESS:'Đang có một lần thanh toán chờ xử lý. Hãy kiểm tra trạng thái đơn.',ALREADY_PAID:'Đơn đã thanh toán đủ. Vui lòng xem chứng từ.',
  RATE_LIMIT_EXCEEDED:'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.',PRICE_CHANGED:'Giá đã thay đổi. Vui lòng xem báo giá mới và xác nhận lại.',POLICY_CHANGED:'Điều kiện đặt phòng đã thay đổi. Vui lòng đọc và xác nhận lại.',
};
export const paymentErrorMessage = (error: unknown): string => {
  if(axios.isAxiosError(error)){const code=error.response?.data?.error?.code;return paymentMessages[code] || error.response?.data?.error?.message || 'Không kết nối được dịch vụ. Vui lòng kiểm tra mạng và thử lại.';}
  return error instanceof Error ? error.message : 'Chưa hoàn tất thao tác. Vui lòng kiểm tra trạng thái và thử lại.';
};
