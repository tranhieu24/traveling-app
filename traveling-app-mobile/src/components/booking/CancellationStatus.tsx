import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, ChevronRight } from 'lucide-react-native';
import type { Booking } from '../../types';
import { accountDate, paidCents, refundStatus } from '../../utils/paymentAccount';
import { formatPaymentMoney } from '../../utils/paymentSummary';
import { PaymentBadge } from '../payments/AccountPaymentCards';

export const CancellationStatus = ({
  booking,
  refreshFailed,
  onRefresh,
  onTrack,
}: {
  booking: Booking;
  refreshFailed: boolean;
  onRefresh: () => void;
  onTrack: () => void;
}) => (
  <View style={s.section}>
    <View style={s.notice}>
      <CheckCircle2 color="#45916D" size={22} />
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Reservation cancelled</Text>
        <Text style={s.copy}>
          {paidCents(booking) > 0
            ? 'Refund requests require admin approval and payment service confirmation.'
            : 'No paid amount is currently recorded for this reservation.'}
        </Text>
      </View>
    </View>
    {!!booking.cancellation_reason && (
      <View style={s.reason}>
        <Text style={s.label}>Cancellation reason</Text>
        <Text style={s.reasonValue}>{booking.cancellation_reason}</Text>
        {!!booking.cancelled_at && <Text style={s.date}>{accountDate(booking.cancelled_at)}</Text>}
      </View>
    )}
    {booking.refunds?.map((refund) => {
      const status = refundStatus[refund.status];
      return (
        <View key={refund.id} style={s.refund}>
          <View style={s.row}>
            <Text style={s.amount}>{formatPaymentMoney(refund.amount)}</Text>
            <PaymentBadge {...status} />
          </View>
          <Text style={s.copy}>{status.description}</Text>
          {!!refund.decision_reason && (
            <Text style={s.reasonValue}>Admin response: {refund.decision_reason}</Text>
          )}
        </View>
      );
    })}
    {paidCents(booking) > 0 && !booking.refunds?.length && (
      <Text style={s.copy}>
        No refund request is listed yet. Check Payments & Payouts or contact support for a review.
      </Text>
    )}
    {refreshFailed && (
      <View style={s.refresh}>
        <Text accessibilityRole="alert" style={s.copy}>
          Your cancellation was recorded, but the latest payment details could not be refreshed.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh cancellation details"
          onPress={onRefresh}
        >
          <Text style={s.link}>Refresh details</Text>
        </Pressable>
      </View>
    )}
    {paidCents(booking) > 0 && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Track refund status"
        onPress={onTrack}
        style={s.track}
      >
        <Text style={s.link}>Track refund status</Text>
        <ChevronRight size={17} color="#00A5B9" />
      </Pressable>
    )}
  </View>
);
const s = StyleSheet.create({
  section: { marginBottom: 22 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 15,
    backgroundColor: '#EEF8F2',
    borderRadius: 12,
  },
  title: { color: '#407A5C', fontSize: 14, fontWeight: '600', lineHeight: 21 },
  copy: { color: '#8D98A3', fontSize: 12, lineHeight: 20, marginTop: 6 },
  reason: { paddingVertical: 16, gap: 6 },
  label: { color: '#8C97A3', fontSize: 11 },
  reasonValue: { fontSize: 12, lineHeight: 20, color: '#596673', marginTop: 5 },
  date: { color: '#A0A9B4', fontSize: 10 },
  refund: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#ECEFF3' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  amount: { fontSize: 16, color: '#3A4958', fontWeight: '600' },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D7EEF1',
    borderRadius: 9,
    padding: 13,
    marginTop: 14,
  },
  link: { color: '#00A5B9', fontSize: 12, fontWeight: '600', marginTop: 3 },
  refresh: { padding: 12, backgroundColor: '#FFFAEE', borderRadius: 8, marginTop: 13 },
});
