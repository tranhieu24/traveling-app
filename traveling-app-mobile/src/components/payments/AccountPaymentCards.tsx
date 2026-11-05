import { uiLocale, useUiPreferences, uiStyle, uiTextStyle, uiText, uiColor } from '../../preferences/ui';

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
export const PaymentBadge = ({ label, tone }: { label: string; tone: StatusTone }) => { useUiPreferences(); return ((
  <View style={uiStyle([s.badge, { backgroundColor: colors[tone].backgroundColor }])}>
    <Text style={uiTextStyle([s.badgeText, { color: colors[tone].color }])}>{uiText(label)}</Text>
  </View>
)); };

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
  useUiPreferences();
  const [expanded, setExpanded] = useState(false);
  const status = getAccountBookingStatus(booking),
    action = getAccountPaymentAction(booking);
  const payments = [...(booking.payments || [])].reverse();
  return (
    <View style={uiStyle(s.card)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uiText(`Xem đơn đặt chỗ ${booking.booking_code}`)}
        onPress={onOpen}
        style={uiStyle(s.cardHeader)}
      >
        <View style={uiStyle(s.icon)}>
          <CreditCard size={21} color={uiColor("#00A8BD")} />
        </View>
        <View style={uiStyle({ flex: 1 })}>
          <Text style={uiTextStyle(s.title)}>{booking.listing_title}</Text>
          <Text style={uiTextStyle(s.reference)}>{uiText(booking.booking_code)}</Text>
        </View>
        <ChevronRight size={19} color={uiColor("#A5ADB7")} />
      </Pressable>
      <View style={uiStyle(s.statusRow)}>
        <Text style={uiTextStyle(s.date)}>
          {uiText(formatTripDates(booking.check_in_date.slice(0, 10), booking.check_out_date.slice(0, 10)))}
        </Text>
        <PaymentBadge {...status} />
      </View>
      <View style={uiStyle(s.amountRow)}>
        <View style={uiStyle({ flex: 1 })}>
          <Text style={uiTextStyle(s.small)}>{uiText("Tổng tiền đặt chỗ")}</Text>
          <Text style={uiTextStyle(s.amount)}>{uiText(formatPaymentMoney(booking.total_price, 'USD', uiLocale()))}</Text>
        </View>
        <View style={uiStyle({ alignItems: 'flex-end' })}>
          <Text style={uiTextStyle(s.small)}>{uiText("Đã thanh toán")}</Text>
          <Text style={uiTextStyle(s.paid)}>{uiText(formatPaymentMoney(paidCents(booking) / 100, 'USD', uiLocale()))}</Text>
        </View>
      </View>
      {action && (
        <View style={uiStyle(s.balanceRow)}>
          <Text style={uiTextStyle(s.small)}>{uiText("Số dư chưa thanh toán")}</Text>
          <Text style={uiTextStyle(s.balance)}>
            {uiText(formatPaymentMoney(booking.balance_due ?? booking.total_price, 'USD', uiLocale()))}
          </Text>
        </View>
      )}
      <View style={uiStyle(s.actions)}>
        {action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText(`${action.label} cho đơn ${booking.booking_code}`)}
            onPress={() => onPay(action.plan)}
            style={uiStyle(s.payButton)}
          >
            <Text style={uiTextStyle(s.payLabel)}>{uiText(action.label)}</Text>
            <ArrowUpRight size={16} color={uiColor("white")} />
          </Pressable>
        )}
        {hasReceipt(booking) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText(`Tải biên lai cho đơn ${booking.booking_code}`)}
            accessibilityState={{ disabled: receiptDisabled, busy: downloading }}
            disabled={receiptDisabled}
            onPress={onReceipt}
            style={uiStyle([s.receiptButton, receiptDisabled && { opacity: 0.5 }])}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={uiColor("#71808D")} />
            ) : (
              <Download size={16} color={uiColor("#71808D")} />
            )}
            <Text style={uiTextStyle(s.receiptLabel)}>{downloading ? uiText('Đang chuẩn bị...') : uiText('Biên lai PDF')}</Text>
          </Pressable>
        )}
      </View>
      {!!receiptError && (
        <Text accessibilityRole="alert" style={uiTextStyle(s.error)}>
          {uiText(receiptError)}
        </Text>
      )}
      {!!receiptMessage && (
        <Text accessibilityLiveRegion="polite" style={uiTextStyle(s.success)}>
          {uiText(receiptMessage)}
        </Text>
      )}
      {payments.length > 0 ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText(`Lịch sử thanh toán của đơn ${booking.booking_code}`)}
            accessibilityState={{ expanded }}
            aria-expanded={expanded}
            onPress={() => setExpanded(!expanded)}
            style={uiStyle(s.historyToggle)}
          >
            <Text style={uiTextStyle(s.historyLabel)}>
              {uiText(payments.length)}{uiText(" giao dịch thanh toán")}</Text>
            {expanded ? (
              <ChevronUp size={16} color={uiColor("#8E99A6")} />
            ) : (
              <ChevronDown size={16} color={uiColor("#8E99A6")} />
            )}
          </Pressable>
          {expanded &&
            payments.map((payment) => {
              const attempt = getPaymentAttemptStatus(payment);
              return (
                <View key={payment.id} style={uiStyle(s.attempt)}>
                  <View style={uiStyle(s.attemptHeader)}>
                    <Text style={uiTextStyle(s.transactionAmount)}>
                      {uiText(formatPaymentMoney(payment.amount, payment.currency || 'USD', uiLocale()))}
                    </Text>
                    <PaymentBadge {...attempt} />
                  </View>
                  <Text style={uiTextStyle(s.date)}>
                    {uiText(accountPaymentMethod(payment))}
                    {uiText(' \u00b7 ')}
                    {uiText(accountDate(payment.paid_at || payment.created_at))}
                  </Text>
                  <Text selectable style={uiTextStyle(s.transactionReference)}>{uiText("Mã tham chiếu:")}{uiText(' ')}
                    {uiText(payment.transaction_reference || payment.provider_payment_id || payment.id)}
                  </Text>
                  {payment.requested_plan === 'deposit' && (
                    <Text style={uiTextStyle(s.date)}>{uiText("Thanh toán tiền cọc")}</Text>
                  )}
                  {payment.requested_plan === 'balance' && (
                    <Text style={uiTextStyle(s.date)}>{uiText("Số tiền còn lại")}</Text>
                  )}
                </View>
              );
            })}
        </>
      ) : (
        <Text style={uiTextStyle(s.noTransactions)}>{uiText("Chưa có giao dịch thanh toán.")}</Text>
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
  useUiPreferences();
  const status = refundStatus[refund.status];
  const payment = booking.payments?.find((item) => item.id === refund.payment_id);
  return (
    <View style={uiStyle(s.card)}>
      <View style={uiStyle(s.cardHeader)}>
        <View style={uiStyle([s.icon, { backgroundColor: '#ECF8F1' }])}>
          <RotateCcw size={21} color={uiColor("#43996A")} />
        </View>
        <View style={uiStyle({ flex: 1 })}>
          <Text style={uiTextStyle(s.title)}>{booking.listing_title}</Text>
          <Text style={uiTextStyle(s.reference)}>{uiText(booking.booking_code)}</Text>
        </View>
      </View>
      <View style={uiStyle(s.refundAmountRow)}>
        <Text style={uiTextStyle(s.refundAmount)}>
          {uiText(formatPaymentMoney(refund.amount, payment?.currency || 'USD', uiLocale()))}
        </Text>
        <PaymentBadge {...status} />
      </View>
      <Text style={uiTextStyle(s.refundDescription)}>{uiText(status.description)}</Text>
      <View style={uiStyle(s.refundDetails)}>
        <View style={uiStyle(s.detailRow)}>
          <Text style={uiTextStyle(s.small)}>{uiText("Ngày yêu cầu")}</Text>
          <Text style={uiTextStyle(s.detailValue)}>{uiText(accountDate(refund.created_at))}</Text>
        </View>
        {refund.status === 'succeeded' && (
          <View style={uiStyle(s.detailRow)}>
            <Text style={uiTextStyle(s.small)}>{uiText("Đã xác nhận hoàn tiền")}</Text>
            <Text style={uiTextStyle(s.detailValue)}>{uiText(accountDate(refund.succeeded_at))}</Text>
          </View>
        )}
        {!!refund.reason && (
          <View style={uiStyle(s.reason)}>
            <Text style={uiTextStyle(s.small)}>{uiText("Lý do")}</Text>
            <Text style={uiTextStyle(s.detailValue)}>{uiText(refund.reason)}</Text>
          </View>
        )}
        {!!refund.decision_reason && (
          <View style={uiStyle(s.reason)}>
            <Text style={uiTextStyle(s.small)}>{uiText("Phản hồi của quản trị viên")}</Text>
            <Text style={uiTextStyle(s.detailValue)}>{uiText(refund.decision_reason)}</Text>
          </View>
        )}
        <Text selectable style={uiTextStyle(s.transactionReference)}>{uiText("Mã hoàn tiền: ")}{uiText(refund.provider_refund_id || refund.id)}
        </Text>
        {payment && <Text style={uiTextStyle(s.date)}>{uiText(accountPaymentMethod(payment))}</Text>}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uiText(`Xem đơn đã hoàn tiền ${booking.booking_code}`)}
        onPress={onOpen}
        style={uiStyle(s.refundBooking)}
      >
        <Text style={uiTextStyle(s.link)}>{uiText("Xem đặt phòng")}</Text>
        <ChevronRight size={17} color={uiColor("#00A0B5")} />
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
