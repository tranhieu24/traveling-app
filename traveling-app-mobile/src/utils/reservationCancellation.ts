import type { Booking } from '../types';
import { isIsoDate, isoToday, addIsoDays } from './checkout';

export const cancellationEligibility = (
  booking: Booking,
  userId?: string | null,
  today = isoToday()
): { allowed: boolean; reason?: string } => {
  if (!userId || booking.guest_id !== userId)
    return { allowed: false, reason: 'Chỉ khách đã tạo đơn mới có thể hủy.' };
  if (!['pending', 'confirmed'].includes(booking.booking_status))
    return { allowed: false, reason: 'Đơn đặt chỗ này không thể hủy nữa.' };
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
    throw new Error('Nhập lý do hủy từ 3 đến 500 ký tự.');
  return reason;
};
