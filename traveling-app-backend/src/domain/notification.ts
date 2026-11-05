export const notificationTypes = ['booking_created', 'payment_received', 'booking_cancelled', 'refund_requested', 'refund_succeeded'] as const;
export type NotificationType = typeof notificationTypes[number];
export interface NotificationRecord {
  id: string;
  event_type: NotificationType;
  booking_id: string | null;
  booking_code: string | null;
  amount: unknown;
  currency: unknown;
  created_at: Date | string;
  read_at: Date | string | null;
}

export function presentNotification(row: NotificationRecord, language: 'vi' | 'en' = 'vi') {
  const booking = row.booking_code ? `đơn ${row.booking_code}` : 'đơn đặt phòng của bạn';
  const amount = typeof row.amount === 'string' || typeof row.amount === 'number' ? Number(row.amount) : NaN;
  const money = row.currency === 'USD' && Number.isFinite(amount) && amount >= 0
    ? ` ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : '';
  const content: Record<NotificationType, { title: string; body: string }> = {
    booking_created: { title: 'Đã tạo yêu cầu đặt phòng', body: `Yêu cầu cho ${booking} đã được tạo. Mở chi tiết để kiểm tra hạn thanh toán và trạng thái xác nhận.` },
    payment_received: { title: 'Đã ghi nhận thanh toán', body: `Đã ghi nhận khoản thanh toán${money} cho ${booking}. Xem chi tiết để kiểm tra số dư và trạng thái hiện tại.` },
    booking_cancelled: { title: 'Đặt phòng đã bị hủy', body: `Đã hủy ${booking}. Việc hủy đơn không đồng nghĩa tiền đã được hoàn; hãy kiểm tra thông tin hoàn tiền trong đơn.` },
    refund_requested: { title: 'Đã tạo yêu cầu hoàn tiền', body: `Yêu cầu hoàn tiền${money} cho ${booking} đang được xử lý. Khoản tiền này chưa được xác nhận đã hoàn.` },
    refund_succeeded: { title: 'Đã xử lý hoàn tiền', body: `Hệ thống đã ghi nhận hoàn tiền thành công${money} cho ${booking}. Thời gian tiền về tài khoản tùy thuộc đơn vị thanh toán.` },
  };
  const reference = row.booking_code ? `booking ${row.booking_code}` : 'your booking';
  const english: Record<NotificationType, { title: string; body: string }> = {
    booking_created: { title: 'Booking request created', body: `Your request for ${reference} was created. Open its details to check the payment deadline and confirmation status.` },
    payment_received: { title: 'Payment received', body: `A payment${money} was recorded for ${reference}. Check the details for the remaining balance and current status.` },
    booking_cancelled: { title: 'Booking cancelled', body: `${reference} was cancelled. Cancellation does not mean a refund has been completed; check the refund details in your booking.` },
    refund_requested: { title: 'Refund requested', body: `A refund request${money} for ${reference} is being processed. The refund has not been confirmed as completed.` },
    refund_succeeded: { title: 'Refund processed', body: `The system recorded a successful refund${money} for ${reference}. The time for funds to reach your account depends on the payment provider.` },
  };
  return {
    id: row.id, type: row.event_type, ...(language === 'en' ? english : content)[row.event_type],
    bookingId: row.booking_id,
    createdAt: new Date(row.created_at).toISOString(),
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
  };
}
