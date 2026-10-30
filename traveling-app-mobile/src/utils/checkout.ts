import type { Booking, PaymentPlan } from '../types';

export const isoToday = (): string => new Date().toISOString().slice(0, 10);
export const isIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
export const addIsoDays = (value: string, days: number): string => new Date(Date.parse(`${value}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const validateTrip = (checkIn: string, checkOut: string, adults: number, children: number, capacity: number): void => {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkIn < isoToday() || checkOut <= checkIn) throw new Error('Choose a check-in date from today and a later check-out date.');
  if ((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000 > 365) throw new Error('Your stay can be up to 365 nights.');
  if (!Number.isSafeInteger(adults) || adults < 1 || !Number.isSafeInteger(children) || children < 0) throw new Error('Include at least one adult and a valid guest count.');
  if (adults + children > capacity) throw new Error(`This place allows up to ${capacity} guests.`);
};
export const formatTripDates = (checkIn: string, checkOut: string): string => {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return '--';
  const start = new Date(`${checkIn}T00:00:00Z`), end = new Date(`${checkOut}T00:00:00Z`);
  const month = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  if (start.getUTCFullYear() !== end.getUTCFullYear()) return `${month(start)} ${start.getUTCDate()}, ${start.getUTCFullYear()} - ${month(end)} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  return start.getUTCMonth() === end.getUTCMonth() ? `${month(start)} ${start.getUTCDate()} - ${end.getUTCDate()}` : `${month(start)} ${start.getUTCDate()} - ${month(end)} ${end.getUTCDate()}`;
};
export const paymentSplit = (total: number | string, plan: PaymentPlan) => {
  const cents = Math.round(Number(total) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Invalid booking total.');
  const due = plan === 'deposit' ? Math.min(3000, cents) : cents;
  return { dueNow: due / 100, remaining: (cents - due) / 100 };
};
export const bookingPaymentDue = (booking: Booking, plan: PaymentPlan): number => {
  const remaining = booking.balance_due ?? Math.max(0, Number(booking.total_price) - Number(booking.amount_paid || 0));
  return paymentSplit(remaining, plan).dueNow;
};
