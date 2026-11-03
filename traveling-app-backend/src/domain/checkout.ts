import { ENV } from '../config/env';
export function getCheckoutPolicy() {
  const depositAmount=ENV.BOOKING_DEPOSIT_USD,cancellationCutoffDays=ENV.CANCELLATION_CUTOFF_DAYS;
  return {
    version:depositAmount===30&&cancellationCutoffDays===0?'stay-v1':`stay-v2-${Math.round(depositAmount*100)}-${cancellationCutoffDays}`,
    currency:'USD',depositAmount,cancellationCutoffDays,timezone:'UTC',
    cancellation:cancellationCutoffDays===0
      ?'Đơn đã xác nhận chỉ được hủy trước ngày nhận phòng theo UTC. Tiền đã trả được tạo yêu cầu hoàn; cần quản trị duyệt và nhà cung cấp xác nhận.'
      :`Đơn đã xác nhận chỉ được hủy trước 00:00 UTC của ngày cách ngày nhận phòng ${cancellationCutoffDays} ngày. Tiền đã trả được tạo yêu cầu hoàn; cần quản trị duyệt và nhà cung cấp xác nhận.`,
    payment:'Đặt phòng chỉ được xác nhận sau khi server kiểm tra thanh toán. Nếu trả cọc, bạn cần thanh toán phần còn lại trước khi hoàn tất chuyến đi.',
    hold:'Chưa thanh toán trong thời hạn giữ lịch: đơn có thể hết hạn. Báo giá chưa giữ phòng.',
  };
}
// Bookings without a snapshot keep the pre-upgrade defaults, never today's config.
export const bookingDepositCents=(b:{policy_snapshot?:{depositAmount?:number}|null})=>Math.round((b.policy_snapshot?.depositAmount??30)*100);
export const cancellationCutoff=(b:{check_in_date:string;policy_snapshot?:{cancellationCutoffDays?:number}|null})=>Date.parse(b.check_in_date.slice(0,10)+'T00:00:00Z')-(b.policy_snapshot?.cancellationCutoffDays??0)*86400000;
export const CHECKOUT_POLICY=getCheckoutPolicy();
