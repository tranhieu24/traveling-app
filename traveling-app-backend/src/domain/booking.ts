import { AppError } from '../types';
export const today = () => new Date().toISOString().slice(0, 10);
export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '9999-12-31') return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateStay(checkIn: string, checkOut: string, guests: number, maxGuests?: number): number {
  if (!isDate(checkIn) || !isDate(checkOut) || checkIn < today() || checkOut <= checkIn) throw new AppError('Valid future dates with check-out after check-in required (UTC)', 400, 'INVALID_DATES');
  if (!Number.isSafeInteger(guests) || guests < 1) throw new AppError('Guests must be a positive integer', 400, 'INVALID_GUESTS');
  if (maxGuests !== undefined && guests > maxGuests) throw new AppError('Accommodation capacity exceeded', 400, 'MAX_GUESTS_EXCEEDED');
  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
  if (nights > 365) throw new AppError('Maximum stay is 365 nights', 400, 'INVALID_DATES');
  return nights;
}
export const cents = (amount: string | number): number => {
  const n = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(n) || n < 0) throw new AppError('Invalid monetary amount', 400, 'INVALID_AMOUNT');
  return n;
};
export const money = (amount: number) => amount / 100;
export function priceStay(listing: any, nights: number, discountCents = 0, taxRate = 0) {
  const nightly = cents(listing.price_per_night), room = nightly * nights;
  const cleaning = cents(listing.cleaning_fee), service = cents(listing.service_fee);
  const discount = Math.min(room, discountCents);
  const tax = Math.round((room + cleaning + service - discount) * taxRate);
  const total = room + cleaning + service - discount + tax;
  if (!Number.isSafeInteger(total) || total > 999999999999) throw new AppError('Price exceeds supported range', 400, 'INVALID_AMOUNT');
  return { currency: 'USD', nightlyRate: money(nightly), roomSubtotal: money(room), cleaningFee: money(cleaning), serviceFee: money(service), discountAmount: money(discount), taxRate, taxAmount: money(tax), tripTotal: money(total), totalNights: nights };
}
export function assertTransition(kind: 'booking' | 'payment' | 'refund', from: string, to: string) {
  const transitions: Record<string, Record<string, string[]>> = {
    booking: { pending: ['confirmed','cancelled','expired'], confirmed: ['completed','cancelled'] },
    payment: { pending: ['succeeded','failed','timed_out'], failed: ['succeeded'], timed_out: ['succeeded'] },
    refund: { requested: ['approved','rejected'], approved: ['processing'], processing: ['succeeded','failed'], failed: ['processing'] },
  };
  if (!transitions[kind][from]?.includes(to)) throw new AppError(`Invalid ${kind} transition: ${from} -> ${to}`, 409, 'INVALID_STATE_TRANSITION');
}
