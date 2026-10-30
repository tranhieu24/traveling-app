import type { Booking, BookingPayment } from '../types';

export type PaymentConfirmationState = 'success' | 'pending' | 'failed' | 'refunded' | 'cancelled' | 'expired';
const timeOf = (payment: BookingPayment) => {
  const value = Date.parse(payment.paid_at || payment.created_at || '');
  return Number.isFinite(value) ? value : 0;
};

export const formatPaymentMoney = (amount: number | string | null | undefined, currency = 'USD'): string => {
  if (amount == null || amount === '' || !Number.isFinite(Number(amount))) return '--';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(amount));
  } catch {
    return `${Number(amount).toFixed(2)} ${currency}`;
  }
};

export const getPaymentSummary = (booking: Booking) => {
  const history = [...(booking.payments || [])].reverse().sort((first, second) => timeOf(second) - timeOf(first));
  const successfulPayment = history.find((payment) => payment.payment_status === 'succeeded');
  // Older API versions expose a flat paid record rather than payment history.
  const legacyPaid = !Array.isArray(booking.payments) && booking.payment_status === 'paid';
  const hasSuccessfulPayment = !!successfulPayment || legacyPaid;
  const currentPayment = successfulPayment || history[0];
  let state: PaymentConfirmationState = 'pending';
  if (booking.payment_status === 'refunded') state = 'refunded';
  else if (booking.booking_status === 'cancelled') state = 'cancelled';
  else if (booking.booking_status === 'expired') state = 'expired';
  else if (hasSuccessfulPayment) state = 'success';
  else if (booking.payment_status === 'failed' || ['failed', 'timed_out'].includes(currentPayment?.payment_status || '')) state = 'failed';

  const paidAt = successfulPayment?.paid_at || (legacyPaid ? booking.paid_at : undefined);
  const date = paidAt ? new Date(paidAt) : null;
  const validDate = date && Number.isFinite(date.getTime()) ? date : null;
  const twoDigits = (value: number) => String(value).padStart(2, '0');
  const dateLabel = validDate ? `${twoDigits(validDate.getDate())}-${twoDigits(validDate.getMonth() + 1)}-${validDate.getFullYear()}` : '--';
  const timeLabel = validDate ? `${twoDigits(validDate.getHours() % 12 || 12)}:${twoDigits(validDate.getMinutes())} ${validDate.getHours() >= 12 ? 'PM' : 'AM'}` : '--';
  const method = currentPayment?.payment_method || booking.payment_method || currentPayment?.provider;
  const methods: Record<string, string> = { credit_card: 'Credit card', mock_credit_card: 'Credit card', card: 'Credit card', mock: 'Mock card', stripe_test: 'Credit card' };
  const paymentMethod = method ? methods[method] || method.replace(/_/g, ' ') : '--';
  const amount = successfulPayment?.amount ?? (legacyPaid ? booking.amount_paid ?? booking.total_price : booking.total_price);
  const currency = currentPayment?.currency || 'USD';

  return {
    state,
    reference: state === 'pending' ? booking.booking_code : currentPayment?.transaction_reference || currentPayment?.provider_payment_id || booking.transaction_reference || booking.booking_code,
    dateLabel,
    timeLabel,
    paymentMethod,
    amountLabel: formatPaymentMoney(amount, currency),
    balanceLabel: Number(booking.balance_due || 0) > 0 ? formatPaymentMoney(booking.balance_due, currency) : null,
    canDownloadReceipt: hasSuccessfulPayment,
    isTestPayment: !!currentPayment?.is_simulated || ['mock', 'stripe_test'].includes(currentPayment?.provider || ''),
  };
};
