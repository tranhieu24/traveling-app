import type { Booking } from '../types';
import { apiClient } from './apiClient';

// The existing account-scoped booking endpoint includes payments and refunds.
// Fetch every page before presenting account totals, rather than only page one.
export const fetchPaymentAccount = async (signal?: AbortSignal): Promise<Booking[]> => {
  const bookings = new Map<string, Booking>();
  let page = 1;
  let totalPages = 1;
  do {
    const response = await apiClient.get('/bookings', {
      params: { status: 'all', page, limit: 50 },
      signal,
    });
    const body = response.data;
    if (
      !body.success ||
      !Array.isArray(body.data) ||
      body.data.some((booking: Booking) => !booking?.id)
    )
      throw new Error('Could not load your payment history. Please try again.');
    const pages = Number(body.pagination?.totalPages ?? 1);
    if (
      !Number.isSafeInteger(pages) ||
      pages < 0 ||
      pages > 100000 ||
      (body.pagination?.page != null && Number(body.pagination.page) !== page)
    )
      throw new Error('Payment history could not be loaded completely. Please refresh.');
    totalPages = pages;
    for (const booking of body.data as Booking[]) bookings.set(booking.id, booking);
    if (page < totalPages && body.data.length === 0)
      throw new Error('Payment history is incomplete. Please refresh.');
    page += 1;
  } while (page <= totalPages);
  return [...bookings.values()];
};
