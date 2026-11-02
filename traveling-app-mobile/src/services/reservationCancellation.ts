import axios from 'axios';
import type { Booking, BookingRefund } from '../types';
import { apiClient } from './apiClient';
import { validateCancellationReason } from '../utils/reservationCancellation';

export const fetchReservation = async (
  bookingId: string,
  signal?: AbortSignal
): Promise<Booking> => {
  const response = await apiClient.get(`/bookings/${encodeURIComponent(bookingId)}`, { signal });
  if (!response.data.success || response.data.data?.id !== bookingId)
    throw new Error('Could not load reservation details. Please try again.');
  return response.data.data;
};
type CancelledReservation = Partial<Booking> & Pick<Booking, 'id' | 'booking_status'>;
export interface CancellationResult {
  booking: CancelledReservation;
  refunds: BookingRefund[];
  detail: Booking | null;
}

export const cancelReservation = async (
  bookingId: string,
  value: string
): Promise<CancellationResult> => {
  const reason = validateCancellationReason(value);
  let result: { booking: CancelledReservation; refunds: BookingRefund[] };
  try {
    const response = await apiClient.patch(`/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      reason,
    });
    const body = response.data.data;
    if (
      !response.data.success ||
      body?.booking?.id !== bookingId ||
      body.booking.booking_status !== 'cancelled' ||
      !Array.isArray(body.refunds)
    )
      throw new Error(
        'Cancellation could not be confirmed. Refresh the reservation before trying again.'
      );
    result = body;
  } catch (error) {
    // A timeout or concurrent cancellation can happen after the server commits.
    // Verify the recorded state before inviting another cancellation attempt.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (![401, 403, 404].includes(status || 0)) {
      try {
        const detail = await fetchReservation(bookingId);
        if (detail.booking_status === 'cancelled')
          return { booking: detail, refunds: detail.refunds || [], detail };
      } catch {
        /* Preserve the original mutation failure. */
      }
    }
    throw error;
  }
  try {
    const detail = await fetchReservation(bookingId);
    if (detail.booking_status === 'cancelled') return { ...result, detail };
  } catch {
    /* The acknowledged cancellation remains valid if refresh fails. */
  }
  return { ...result, detail: null };
};

export const cancellationErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error))
    return (
      error.response?.data?.error?.message ||
      'Could not confirm cancellation. Check your connection and try again.'
    );
  return error instanceof Error
    ? error.message
    : 'Could not cancel this reservation. Please try again.';
};
