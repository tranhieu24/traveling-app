import axios from 'axios';
import type { Booking, BookingPayment, PaymentPlan } from '../types';
import { apiClient } from './apiClient';
import { storage } from '../utils/storage';
import { getPaymentSummary } from '../utils/paymentSummary';

const inFlight = new Map<string, Promise<Booking>>();
const isExpired = (value?: string | null): boolean => !!value && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now();

const readBooking = async (bookingId: string): Promise<Booking> => {
  const response = await apiClient.get(`/bookings/${encodeURIComponent(bookingId)}`);
  if (!response.data.success || response.data.data?.id !== bookingId) throw new Error('Could not verify your booking. Please try again.');
  return response.data.data;
};

const runPayment = async (bookingId: string, requestedPlan?: PaymentPlan): Promise<Booking> => {
  const booking = await readBooking(bookingId);
  if (getPaymentSummary(booking).state === 'success' && requestedPlan !== 'balance') return booking;
  if (requestedPlan === 'balance' && (Number(booking.amount_paid || 0) <= 0 || Number(booking.balance_due || 0) <= 0)) throw new Error('There is no outstanding deposit balance to pay.');
  if (!['pending', 'confirmed'].includes(booking.booking_status)) throw new Error('This booking cannot accept a payment. Check its reservation status.');
  if (booking.booking_status === 'pending' && isExpired(booking.payment_due_at)) throw new Error('The booking hold has expired. Please choose your dates and make a new reservation.');

  const plan = requestedPlan || (booking.payment_plan === 'deposit' ? 'deposit' : 'full');
  const keyName = `traveling_payment_key_${bookingId}_${plan}`;
  let payment: BookingPayment | undefined = booking.payments?.find((entry) => entry.payment_status === 'pending' && !isExpired(entry.expires_at));

  if (payment?.requested_plan && payment.requested_plan !== plan) throw new Error('Another payment is already pending. Check its status before starting a different payment.');

  if (!payment) {
    let key = await storage.getItem(keyName);
    const previous = key ? booking.payments?.find((entry) => entry.idempotency_key === key) : undefined;
    if (previous && (previous.payment_status !== 'pending' || isExpired(previous.expires_at))) key = null;
    if (!key) {
      key = `checkout_${bookingId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      await storage.setItem(keyName, key);
    }
    const response = await apiClient.post(`/bookings/${encodeURIComponent(bookingId)}/payments`, { plan }, { headers: { 'Idempotency-Key': key } });
    const result = response.data.data;
    if (!response.data.success || !result?.payment?.id) throw new Error('Could not start your payment. Please try again.');
    payment = result.payment as BookingPayment;
    if (!result.simulation || payment.provider !== 'mock' || payment.is_simulated !== true) {
      throw new Error('This checkout supports mock payments only. Card gateway confirmation is not available here.');
    }
  }

  if (payment.requested_plan && payment.requested_plan !== plan) throw new Error('Payment plan does not match this request.');
  if (payment.booking_id && payment.booking_id !== bookingId) throw new Error('Payment does not match this booking.');
  if (payment.payment_status === 'pending') {
    if (payment.provider !== 'mock' || payment.is_simulated !== true) throw new Error('Complete this payment with its card gateway. It cannot be simulated.');
    if (isExpired(payment.expires_at)) throw new Error('The payment attempt has expired. Please try again.');
    const response = await apiClient.post(`/payments/${encodeURIComponent(payment.id)}/simulate`, { outcome: 'succeeded' });
    if (!response.data.success) throw new Error('The payment could not be completed. Check your booking and try again.');
  } else if (payment.payment_status !== 'succeeded') {
    await storage.removeItem(keyName);
    throw new Error('This payment attempt did not succeed. Please try again.');
  }

  const paymentId = payment.id;
  const updated = await readBooking(bookingId);
  const verifiedPayment = updated.payments?.find((entry) => entry.id === paymentId && entry.payment_status === 'succeeded');
  if (!verifiedPayment || getPaymentSummary(updated).state !== 'success') throw new Error('Payment is not confirmed yet. Check your booking status and try again.');
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

export const paymentErrorMessage = (error: unknown): string =>
  axios.isAxiosError(error)
    ? error.response?.data?.error?.message || 'Could not connect to the payment service. Please try again.'
    : error instanceof Error ? error.message : 'Your payment could not be completed. Please try again.';
