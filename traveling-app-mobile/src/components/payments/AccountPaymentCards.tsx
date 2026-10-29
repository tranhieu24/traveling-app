import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  Download,
  RotateCcw,
} from 'lucide-react-native';
import type { Booking, BookingRefund, PaymentPlan } from '../../types';
import { formatPaymentMoney } from '../../utils/paymentSummary';
import { formatTripDates } from '../../utils/checkout';
import {
  accountDate,
  accountPaymentMethod,
  getAccountBookingStatus,
  getAccountPaymentAction,
  getPaymentAttemptStatus,
  hasReceipt,
  paidCents,
  refundStatus,
  StatusTone,
} from '../../utils/paymentAccount';

const colors: Record<StatusTone, { backgroundColor: string; color: string }> = {
  success: { backgroundColor: '#EAF8EF', color: '#23784A' },
  pending: { backgroundColor: '#FFF5DE', color: '#986B1C' },
  error: { backgroundColor: '#FDEEF0', color: '#BD4053' },
  neutral: { backgroundColor: '#F0F2F5', color: '#737D89' },
};
export const PaymentBadge = ({ label, tone }: { label: string; tone: StatusTone }) => (
  <View style={[s.badge, { backgroundColor: colors[tone].backgroundColor }]}>
    <Text style={[s.badgeText, { color: colors[tone].color }]}>{label}</Text>
  </View>
);

export const PaymentBookingCard = ({
  booking,
  onOpen,
  onPay,
  onReceipt,
  downloading,
  receiptDisabled,
  receiptMessage,
  receiptError,
}: {
  booking: Booking;
  onOpen: () => void;
  onPay: (plan: PaymentPlan) => void;
  onReceipt: () => void;
  downloading: boolean;
  receiptDisabled: boolean;
  receiptMessage?: string;
  receiptError?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const status = getAccountBookingStatus(booking),
    action = getAccountPaymentAction(booking);
  const payments = [...(booking.payments || [])].reverse();
  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View booking ${booking.booking_code}`}
        onPress={onOpen}
        style={s.cardHeader}
      >
        <View style={s.icon}>
          <CreditCard size={21} color="#00A8BD" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{booking.listing_title}</Text>
          <Text style={s.reference}>{booking.booking_code}</Text>
        </View>
        <ChevronRight size={19} color="#A5ADB7" />
      </Pressable>
      <View style={s.statusRow}>
        <Text style={s.date}>
          {formatTripDates(booking.check_in_date.slice(0, 10), booking.check_out_date.slice(0, 10))}
        </Text>
        <PaymentBadge {...status} />
      </View>
      <View style={s.amountRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.small}>Booking total</Text>
          <Text style={s.amount}>{formatPaymentMoney(booking.total_price)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.small}>Paid</Text>
          <Text style={s.paid}>{formatPaymentMoney(paidCents(booking) / 100)}</Text>
        </View>
      </View>
      {action && (
        <View style={s.balanceRow}>
          <Text style={s.small}>Outstanding balance</Text>
          <Text style={s.balance}>
            {formatPaymentMoney(booking.balance_due ?? booking.total_price)}
          </Text>
        </View>
      )}
      <View style={s.actions}>
        {action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${action.label} for ${booking.booking_code}`}
            onPress={() => onPay(action.plan)}
            style={s.payButton}
          >
            <Text style={s.payLabel}>{action.label}</Text>
            <ArrowUpRight size={16} color="white" />
          </Pressable>
        )}
        {hasReceipt(booking) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Download receipt for ${booking.booking_code}`}
            accessibilityState={{ disabled: receiptDisabled, busy: downloading }}
            disabled={receiptDisabled}
            onPress={onReceipt}
            style={[s.receiptButton, receiptDisabled && { opacity: 0.5 }]}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#71808D" />
            ) : (
              <Download size={16} color="#71808D" />
            )}
            <Text style={s.receiptLabel}>{downloading ? 'Preparing...' : 'PDF receipt'}</Text>
          </Pressable>
        )}
      </View>
      {!!receiptError && (
        <Text accessibilityRole="alert" style={s.error}>
          {receiptError}
        </Text>
      )}
      {!!receiptMessage && (
        <Text accessibilityLiveRegion="polite" style={s.success}>
          {receiptMessage}
        </Text>
      )}
      {payments.length > 0 ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Payment attempts for ${booking.booking_code}`}
            accessibilityState={{ expanded }}
            aria-expanded={expanded}
            onPress={() => setExpanded(!expanded)}
            style={s.historyToggle}
          >
            <Text style={s.historyLabel}>
              {payments.length} payment {payments.length === 1 ? 'transaction' : 'transactions'}
            </Text>
            {expanded ? (
              <ChevronUp size={16} color="#8E99A6" />
            ) : (
              <ChevronDown size={16} color="#8E99A6" />
            )}
          </Pressable>
          {expanded &&
            payments.map((payment) => {
              const attempt = getPaymentAttemptStatus(payment);
              return (
                <View key={payment.id} style={s.attempt}>
                  <View style={s.attemptHeader}>
                    <Text style={s.transactionAmount}>
                      {formatPaymentMoney(payment.amount, payment.currency || 'USD')}
                    </Text>
                    <PaymentBadge {...attempt} />
                  </View>
                  <Text style={s.date}>
                    {accountPaymentMethod(payment)}
                    {' \u00b7 '}
                    {accountDate(payment.paid_at || payment.created_at)}
                  </Text>
                  <Text selectable style={s.transactionReference}>
                    Ref:{' '}
                    {payment.transaction_reference || payment.provider_payment_id || payment.id}
                  </Text>
                  {payment.requested_plan === 'deposit' && (
                    <Text style={s.date}>Deposit payment</Text>
                  )}
                  {payment.requested_plan === 'balance' && (
                    <Text style={s.date}>Remaining balance</Text>
                  )}
                </View>
              );
            })}
        </>
      ) : (
        <Text style={s.noTransactions}>No payment transactions yet.</Text>
      )}
    </View>
  );
};

export const RefundCard = ({
  booking,
  refund,
  onOpen,
}: {
  booking: Booking;
  refund: BookingRefund;
  onOpen: () => void;
}) => {
  const status = refundStatus[refund.status];
  const payment = booking.payments?.find((item) => item.id === refund.payment_id);
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={[s.icon, { backgroundColor: '#ECF8F1' }]}>
          <RotateCcw size={21} color="#43996A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{booking.listing_title}</Text>
          <Text style={s.reference}>{booking.booking_code}</Text>
        </View>
      </View>
      <View style={s.refundAmountRow}>
        <Text style={s.refundAmount}>
          {formatPaymentMoney(refund.amount, payment?.currency || 'USD')}
        </Text>
        <PaymentBadge {...status} />
      </View>
      <Text style={s.refundDescription}>{status.description}</Text>
      <View style={s.refundDetails}>
        <View style={s.detailRow}>
          <Text style={s.small}>Requested</Text>
          <Text style={s.detailValue}>{accountDate(refund.created_at)}</Text>
        </View>
        {refund.status === 'succeeded' && (
          <View style={s.detailRow}>
            <Text style={s.small}>Refund confirmed</Text>
            <Text style={s.detailValue}>{accountDate(refund.succeeded_at)}</Text>
          </View>
        )}
        {!!refund.reason && (
          <View style={s.reason}>
            <Text style={s.small}>Reason</Text>
            <Text style={s.detailValue}>{refund.reason}</Text>
          </View>
        )}
        {!!refund.decision_reason && (
          <View style={s.reason}>
            <Text style={s.small}>Admin response</Text>
            <Text style={s.detailValue}>{refund.decision_reason}</Text>
          </View>
        )}
        <Text selectable style={s.transactionReference}>
          Refund ref: {refund.provider_refund_id || refund.id}
        </Text>
        {payment && <Text style={s.date}>{accountPaymentMethod(payment)}</Text>}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View refunded booking ${booking.booking_code}`}
        onPress={onOpen}
        style={s.refundBooking}
      >
        <Text style={s.link}>View booking</Text>
        <ChevronRight size={17} color="#00A0B5" />
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#E6EAEF',
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#ECFAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: '#2C3745' },
  reference: { color: '#97A0AC', fontSize: 11, lineHeight: 18, marginTop: 3 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  date: { fontSize: 12, lineHeight: 19, color: '#919AA6' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, lineHeight: 15, fontWeight: '600' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 16,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  small: { fontSize: 12, lineHeight: 19, color: '#919AA6' },
  amount: { fontSize: 21, lineHeight: 28, fontWeight: '700', color: '#2C3745', marginTop: 3 },
  paid: { fontSize: 17, lineHeight: 26, fontWeight: '600', color: '#2C3745', marginTop: 3 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  balance: { fontSize: 13, color: '#00A3B8', fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 },
  payButton: {
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00B8CE',
  },
  payLabel: { fontSize: 12, fontWeight: '600', color: 'white' },
  receiptButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCE2E9',
    borderRadius: 8,
  },
  receiptLabel: { fontSize: 12, color: '#71808D', fontWeight: '500' },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingVertical: 9,
  },
  historyLabel: { color: '#8A96A3', fontSize: 12 },
  noTransactions: { color: '#9AA4AF', fontSize: 12, lineHeight: 18, marginTop: 12 },
  attempt: {
    borderTopWidth: 1,
    borderTopColor: '#EFF2F5',
    paddingTop: 13,
    paddingBottom: 9,
    gap: 5,
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  transactionAmount: { fontSize: 14, fontWeight: '600', color: '#3C4858' },
  transactionReference: { fontSize: 10, lineHeight: 17, color: '#939EAA' },
  error: { color: '#BD4053', fontSize: 12, lineHeight: 19, marginTop: 10 },
  success: { color: '#23784A', fontSize: 12, lineHeight: 19, marginTop: 10 },
  refundAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 22,
  },
  refundAmount: { fontSize: 28, lineHeight: 36, color: '#2C3745', fontWeight: '700' },
  refundDescription: { color: '#8A96A3', fontSize: 12, lineHeight: 20, marginTop: 12 },
  refundDetails: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    gap: 7,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  detailValue: { fontSize: 12, color: '#536172', lineHeight: 19, flexShrink: 1 },
  reason: { gap: 4, paddingVertical: 3 },
  refundBooking: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  link: { color: '#00A0B5', fontSize: 12, fontWeight: '600' },
});
