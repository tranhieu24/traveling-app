import type { Booking, BookingPayment, BookingRefund, PaymentPlan } from '../types';
import { getPaymentSummary } from './paymentSummary';

export type PaymentHistoryFilter = 'all' | 'outstanding' | 'paid';
export type StatusTone = 'success' | 'pending' | 'error' | 'neutral';
const amount = (value: number | string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
};
export const paidCents = (booking: Booking): number =>
  booking.amount_paid != null
    ? amount(booking.amount_paid)
    : (booking.payments || [])
        .filter((payment) => payment.payment_status === 'succeeded')
        .reduce((sum, payment) => sum + amount(payment.amount), 0);

export const getAccountPaymentAction = (
  booking: Booking,
  now = Date.now()
): { label: string; plan: PaymentPlan } | null => {
  if (
    !['pending', 'confirmed'].includes(booking.booking_status) ||
    booking.payment_status === 'refunded' ||
    amount(booking.balance_due ?? booking.total_price) === 0
  )
    return null;
  if (
    booking.booking_status === 'pending' &&
    booking.payment_due_at &&
    (!Number.isFinite(Date.parse(booking.payment_due_at)) ||
      Date.parse(booking.payment_due_at) <= now)
  )
    return null;
  return paidCents(booking) > 0
    ? { label: 'Thanh toán số tiền còn lại', plan: 'balance' }
    : { label: 'Tiếp tục thanh toán', plan: booking.payment_plan === 'deposit' ? 'deposit' : 'full' };
};

export const getPaymentAttemptStatus = (
  payment: BookingPayment,
  now = Date.now()
): { label: string; tone: StatusTone } => {
  if (payment.payment_status === 'succeeded') return { label: 'Đã thanh toán', tone: 'success' };
  if (payment.payment_status === 'failed') return { label: 'Thất bại', tone: 'error' };
  if (payment.payment_status === 'refunded') return { label: 'Đã hoàn tiền', tone: 'neutral' };
  if (
    payment.payment_status === 'timed_out' ||
    (payment.expires_at && Date.parse(payment.expires_at) <= now)
  )
    return { label: 'Đã hết hạn', tone: 'neutral' };
  return { label: 'Đang chờ', tone: 'pending' };
};

export const refundStatus: Record<
  BookingRefund['status'],
  { label: string; tone: StatusTone; description: string }
> = {
  requested: {
    label: 'Chờ phê duyệt',
    tone: 'pending',
    description: 'Yêu cầu hoàn tiền đang chờ quản trị viên xem xét.',
  },
  approved: {
    label: 'Đã phê duyệt',
    tone: 'pending',
    description:
      'Quản trị viên đã phê duyệt. Dịch vụ thanh toán chưa xác nhận hoàn tiền.',
  },
  processing: {
    label: 'Đang xử lý',
    tone: 'pending',
    description: 'Khoản hoàn tiền đang được dịch vụ thanh toán xử lý.',
  },
  succeeded: {
    label: 'Đã hoàn tiền',
    tone: 'success',
    description: 'Dịch vụ thanh toán đã xác nhận khoản hoàn tiền.',
  },
  failed: {
    label: 'Xử lý thất bại',
    tone: 'error',
    description: 'Khoản hoàn chưa hoàn tất. Hãy liên hệ hỗ trợ để quản trị viên xem xét.',
  },
  rejected: {
    label: 'Không được phê duyệt',
    tone: 'neutral',
    description: 'Quản trị viên đã từ chối yêu cầu hoàn tiền.',
  },
};

export const getAccountBookingStatus = (
  booking: Booking,
  now = Date.now()
): { label: string; tone: StatusTone } => {
  if (booking.payment_status === 'refunded') return { label: 'Đã hoàn tiền', tone: 'success' };
  if (
    booking.refunds?.some((refund) =>
      ['requested', 'approved', 'processing'].includes(refund.status)
    )
  )
    return { label: 'Đang chờ hoàn tiền', tone: 'pending' };
  if (booking.booking_status === 'cancelled') return { label: 'Đã hủy', tone: 'neutral' };
  if (
    booking.booking_status === 'expired' ||
    (booking.booking_status === 'pending' &&
      !!booking.payment_due_at &&
      Date.parse(booking.payment_due_at) <= now)
  )
    return { label: 'Đã hết hạn', tone: 'neutral' };
  if (paidCents(booking) > 0)
    return amount(booking.balance_due) > 0
      ? { label: 'Đã thanh toán một phần', tone: 'pending' }
      : { label: 'Đã thanh toán', tone: 'success' };
  const latest = [...(booking.payments || [])].sort(
    (a, b) => Date.parse(b.created_at || '') - Date.parse(a.created_at || '')
  )[0];
  return latest
    ? getPaymentAttemptStatus(latest, now)
    : { label: 'Chờ thanh toán', tone: 'pending' };
};

export const matchesPaymentFilter = (booking: Booking, filter: PaymentHistoryFilter): boolean =>
  filter === 'outstanding'
    ? !!getAccountPaymentAction(booking)
    : filter === 'paid'
      ? paidCents(booking) > 0
      : true;

export const getAccountTotals = (bookings: Booking[]) => {
  const paid = bookings.reduce((sum, booking) => sum + paidCents(booking), 0);
  const outstanding = bookings.reduce(
    (sum, booking) =>
      sum +
      (getAccountPaymentAction(booking) ? amount(booking.balance_due ?? booking.total_price) : 0),
    0
  );
  const refunded = bookings.reduce(
    (sum, booking) =>
      sum +
      (booking.amount_refunded != null
        ? amount(booking.amount_refunded)
        : (booking.refunds || [])
            .filter((refund) => refund.status === 'succeeded')
            .reduce((total, refund) => total + amount(refund.amount), 0)),
    0
  );
  return { paid: paid / 100, outstanding: outstanding / 100, refunded: refunded / 100 };
};

export const collectRefunds = (bookings: Booking[]) =>
  bookings
    .flatMap((booking) => (booking.refunds || []).map((refund) => ({ booking, refund })))
    .sort((a, b) => Date.parse(b.refund.created_at) - Date.parse(a.refund.created_at));

export const accountDate = (value?: string | null): string => {
  if (!value || !Number.isFinite(Date.parse(value))) return '--';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
export const accountPaymentMethod = (payment: BookingPayment): string => {
  if (payment.is_simulated || ['mock', 'legacy_mock'].includes(payment.provider || ''))
    return 'Thẻ mô phỏng';
  if (payment.provider === 'stripe_test') return 'Thẻ thử nghiệm';
  return payment.payment_method
    ? { credit_card: 'Thẻ tín dụng', card: 'Thẻ', mock_credit_card: 'Thẻ mô phỏng' }[
        payment.payment_method
      ] || payment.payment_method.replace(/_/g, ' ')
    : 'Thanh toán';
};
export const hasReceipt = (booking: Booking): boolean =>
  getPaymentSummary(booking).canDownloadReceipt;
