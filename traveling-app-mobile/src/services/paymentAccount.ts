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
      throw new Error('Không thể tải lịch sử thanh toán. Vui lòng thử lại.');
    const pages = Number(body.pagination?.totalPages ?? 1);
    if (
      !Number.isSafeInteger(pages) ||
      pages < 0 ||
      pages > 100000 ||
      (body.pagination?.page != null && Number(body.pagination.page) !== page)
    )
      throw new Error('Lịch sử thanh toán chưa được tải đầy đủ. Vui lòng cập nhật.');
    totalPages = pages;
    for (const booking of body.data as Booking[]) bookings.set(booking.id, booking);
    if (page < totalPages && body.data.length === 0)
      throw new Error('Lịch sử thanh toán không đầy đủ. Vui lòng cập nhật.');
    page += 1;
  } while (page <= totalPages);
  return [...bookings.values()];
};
