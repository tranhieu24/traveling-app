import type { Booking, PaymentPlan } from '../types';

export const isoToday = (): string => new Date().toISOString().slice(0, 10);
export const isIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
export const addIsoDays = (value: string, days: number): string => new Date(Date.parse(`${value}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const validateTrip = (checkIn: string, checkOut: string, adults: number, children: number, capacity: number): void => {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkIn < isoToday() || checkOut <= checkIn) throw new Error('Chọn ngày nhận phòng từ hôm nay và ngày trả phòng sau đó.');
  if ((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000 > 365) throw new Error('Thời gian lưu trú tối đa là 365 đêm.');
  if (!Number.isSafeInteger(adults) || adults < 1 || !Number.isSafeInteger(children) || children < 0) throw new Error('Cần ít nhất một người lớn và số khách hợp lệ.');
  if (adults + children > capacity) throw new Error(`Chỗ ở này nhận tối đa ${capacity} khách.`);
};
export const formatTripDates = (checkIn: string, checkOut: string): string => {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return '--';
  const start = new Date(`${checkIn}T00:00:00Z`), end = new Date(`${checkOut}T00:00:00Z`);
  const dateLabel = (date: Date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  return `${dateLabel(start)} – ${dateLabel(end)}`;
};
export const paymentSplit = (total: number | string, plan: PaymentPlan, depositAmount = 30) => {
  const cents = Math.round(Number(total) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Tổng tiền đặt phòng không hợp lệ.');
  const due = plan === 'deposit' ? Math.min(Math.round(depositAmount * 100), cents) : cents;
  return { dueNow: due / 100, remaining: (cents - due) / 100 };
};
export const bookingPaymentDue = (booking: Booking, plan: PaymentPlan): number => {
  const remaining = booking.balance_due ?? Math.max(0, Number(booking.total_price) - Number(booking.amount_paid || 0));
  return paymentSplit(remaining, plan, booking.policy_snapshot?.depositAmount ?? 30).dueNow;
};
