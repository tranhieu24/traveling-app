import type { Booking } from '../types';
import { isIsoDate, isoToday, addIsoDays } from './checkout';

export const cancellationEligibility = (
  booking: Booking,
  userId?: string | null,
  today = isoToday()
): { allowed: boolean; reason?: string } => {
  if (!userId || booking.guest_id !== userId)
    return { allowed: false, reason: 'Only the guest who made this reservation can cancel it.' };
  if (!['pending', 'confirmed'].includes(booking.booking_status))
    return { allowed: false, reason: 'This reservation can no longer be cancelled.' };
  if (booking.booking_status === 'confirmed') {
    const checkIn = booking.check_in_date.slice(0, 10);
    if (!isIsoDate(checkIn) || addIsoDays(checkIn,-(booking.policy_snapshot?.cancellationCutoffDays??0)) <= today)
      return {
        allowed: false,
        reason:
          'Đã quá hạn hủy theo chính sách lưu trong đơn (UTC). Vui lòng gửi yêu cầu hỗ trợ.',
      };
  }
  return { allowed: true };
};

export const validateCancellationReason = (value: string): string => {
  const reason = value.trim();
  if (reason.length < 3 || reason.length > 500)
    throw new Error('Enter a cancellation reason between 3 and 500 characters.');
  return reason;
};
