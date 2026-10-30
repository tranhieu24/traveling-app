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
    ? { label: 'Pay remaining balance', plan: 'balance' }
    : { label: 'Continue payment', plan: booking.payment_plan === 'deposit' ? 'deposit' : 'full' };
};

export const getPaymentAttemptStatus = (
  payment: BookingPayment,
  now = Date.now()
): { label: string; tone: StatusTone } => {
  if (payment.payment_status === 'succeeded') return { label: 'Paid', tone: 'success' };
  if (payment.payment_status === 'failed') return { label: 'Failed', tone: 'error' };
  if (payment.payment_status === 'refunded') return { label: 'Refunded', tone: 'neutral' };
  if (
    payment.payment_status === 'timed_out' ||
    (payment.expires_at && Date.parse(payment.expires_at) <= now)
  )
    return { label: 'Expired', tone: 'neutral' };
  return { label: 'Pending', tone: 'pending' };
};

export const refundStatus: Record<
  BookingRefund['status'],
  { label: string; tone: StatusTone; description: string }
> = {
  requested: {
    label: 'Awaiting approval',
    tone: 'pending',
    description: 'Your refund request is waiting for an admin to review it.',
  },
  approved: {
    label: 'Approved',
    tone: 'pending',
    description:
      'An admin approved this refund. The payment service has not confirmed the return yet.',
  },
  processing: {
    label: 'Processing',
    tone: 'pending',
    description: 'Your refund is being processed by the payment service.',
  },
  succeeded: {
    label: 'Refunded',
    tone: 'success',
    description: 'The payment service has confirmed this refund.',
  },
  failed: {
    label: 'Processing failed',
    tone: 'error',
    description: 'The return has not completed. Contact support so an admin can review it.',
  },
  rejected: {
    label: 'Not approved',
    tone: 'neutral',
    description: 'An admin declined this refund request.',
  },
};

export const getAccountBookingStatus = (
  booking: Booking,
  now = Date.now()
): { label: string; tone: StatusTone } => {
  if (booking.payment_status === 'refunded') return { label: 'Refunded', tone: 'success' };
  if (
    booking.refunds?.some((refund) =>
      ['requested', 'approved', 'processing'].includes(refund.status)
    )
  )
    return { label: 'Refund pending', tone: 'pending' };
  if (booking.booking_status === 'cancelled') return { label: 'Cancelled', tone: 'neutral' };
  if (
    booking.booking_status === 'expired' ||
    (booking.booking_status === 'pending' &&
      !!booking.payment_due_at &&
      Date.parse(booking.payment_due_at) <= now)
  )
    return { label: 'Expired', tone: 'neutral' };
  if (paidCents(booking) > 0)
    return amount(booking.balance_due) > 0
      ? { label: 'Partially paid', tone: 'pending' }
      : { label: 'Paid', tone: 'success' };
  const latest = [...(booking.payments || [])].sort(
    (a, b) => Date.parse(b.created_at || '') - Date.parse(a.created_at || '')
  )[0];
  return latest
    ? getPaymentAttemptStatus(latest, now)
    : { label: 'Awaiting payment', tone: 'pending' };
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
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
export const accountPaymentMethod = (payment: BookingPayment): string => {
  if (payment.is_simulated || ['mock', 'legacy_mock'].includes(payment.provider || ''))
    return 'Mock card';
  if (payment.provider === 'stripe_test') return 'Test card';
  return payment.payment_method
    ? { credit_card: 'Credit card', card: 'Card', mock_credit_card: 'Mock card' }[
        payment.payment_method
      ] || payment.payment_method.replace(/_/g, ' ')
    : 'Payment';
};
export const hasReceipt = (booking: Booking): boolean =>
  getPaymentSummary(booking).canDownloadReceipt;
