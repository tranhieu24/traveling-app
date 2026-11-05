import { uiLocale, useUiPreferences, uiStyle, uiText, uiColor, uiTextStyle } from '../../preferences/ui';

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CalendarX, ShieldCheck, X } from 'lucide-react-native';
import type { Booking } from '../../types';
import { formatTripDates } from '../../utils/checkout';
import { paidCents } from '../../utils/paymentAccount';
import { formatPaymentMoney } from '../../utils/paymentSummary';
import { validateCancellationReason } from '../../utils/reservationCancellation';

export const CancelReservationModal = ({
  visible,
  booking,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  booking: Booking;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) => {
  useUiPreferences();
  const [reason, setReason] = useState(''),
    [fieldError, setFieldError] = useState('');
  useEffect(() => {
    if (visible) {
      setReason('');
      setFieldError('');
    }
  }, [visible]);
  const confirm = () => {
    try {
      const value = validateCancellationReason(reason);
      setFieldError('');
      onConfirm(value);
    } catch (failure) {
      setFieldError((failure as Error).message);
    }
  };
  const paid = paidCents(booking) / 100;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={uiStyle(s.overlay)}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uiText("Đóng yêu cầu hủy")}
          disabled={busy}
          onPress={onClose}
          style={uiStyle(StyleSheet.absoluteFill)}
        />
        <View style={uiStyle(s.card)} accessibilityViewIsModal>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={uiStyle(s.content)}>
            <View style={uiStyle(s.top)}>
              <View style={uiStyle(s.icon)}>
                <CalendarX size={27} color={uiColor("#E5646D")} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Đóng yêu cầu hủy")}
                disabled={busy}
                onPress={onClose}
                style={uiStyle(s.close)}
              >
                <X size={20} color={uiColor("#929AA5")} />
              </Pressable>
            </View>
            <Text accessibilityRole="header" style={uiTextStyle(s.title)}>{uiText("Hủy đặt phòng?")}</Text>
            <Text style={uiTextStyle(s.description)}>{uiText("Kỳ lưu trú sẽ bị hủy khi bạn xác nhận. Hãy cho chúng tôi biết lý do để yêu cầu được xem xét.")}</Text>
            {!!booking.policy_snapshot&&<Text style={uiTextStyle(s.description)}>{uiText(booking.policy_snapshot.cancellation)}</Text>}
            <View style={uiStyle(s.booking)}>
              <Text style={uiTextStyle(s.bookingTitle)}>{booking.listing_title}</Text>
              <Text style={uiTextStyle(s.bookingDates)}>
                {uiText(formatTripDates(
                  booking.check_in_date.slice(0, 10),
                  booking.check_out_date.slice(0, 10)
                ))}
                {uiText(' \u00b7 ')}
                {uiText(booking.number_of_guests)}{uiText(" khách")}</Text>
              <Text style={uiTextStyle(s.reference)}>{uiText(booking.booking_code)}</Text>
            </View>
            <Text style={uiTextStyle(s.label)}>{uiText("Lý do hủy ")}<Text style={uiTextStyle({ color: '#D85865' })}>{uiText("*")}</Text>
            </Text>
            <TextInput
              accessibilityLabel={uiText("Lý do hủy")}
              editable={!busy}
              multiline
              maxLength={500}
              value={reason}
              onChangeText={(value) => {
                setReason(value);
                setFieldError('');
              }}
              placeholder={uiText("Cho chúng tôi biết lý do bạn cần hủy...")}
              placeholderTextColor={uiColor("#A1A9B3")}
              textAlignVertical="top"
              style={uiStyle([s.input, !!fieldError && { borderColor: '#D85865' }])}
            />
            <Text style={uiTextStyle(s.counter)}>{uiText(reason.length)}{uiText("/500")}</Text>
            {!!fieldError && (
              <Text accessibilityRole="alert" style={uiTextStyle(s.error)}>
                {uiText(fieldError)}
              </Text>
            )}
            <View style={uiStyle(s.refund)}>
              <ShieldCheck size={20} color={uiColor("#AA7B2F")} />
              <View style={uiStyle({ flex: 1 })}>
                <Text style={uiTextStyle(s.refundTitle)}>
                  {paid > 0 ? uiText(`Đã thanh toán: ${formatPaymentMoney(paid, 'USD', uiLocale())}`) : uiText('Chưa ghi nhận khoản thanh toán')}
                </Text>
                <Text style={uiTextStyle(s.refundCopy)}>
                  {paid > 0 ? uiText('Yêu cầu hoàn tiền cần quản trị viên xét duyệt. Tiền chỉ được hoàn sau khi được phê duyệt và dịch vụ thanh toán xác nhận.') : uiText('Đơn đặt chỗ sẽ bị hủy. Hiện không có khoản thanh toán thành công để hoàn lại.')}
                </Text>
              </View>
            </View>
            {!!error && (
              <Text accessibilityRole="alert" style={uiTextStyle(s.error)}>
                {uiText(error)}
              </Text>
            )}
          </ScrollView>
          <View style={uiStyle(s.actions)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={uiText("Xác nhận hủy")}
              disabled={busy}
              accessibilityState={{ busy, disabled: busy }}
              onPress={confirm}
              style={uiStyle([s.confirm, busy && { opacity: 0.6 }])}
            >
              {busy && <ActivityIndicator color={uiColor("white")} size="small" />}
              <Text style={uiTextStyle(s.confirmLabel)}>{busy ? uiText('Đang hủy...') : uiText('Xác nhận hủy')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={uiText("Giữ đơn đặt chỗ")}
              disabled={busy}
              onPress={onClose}
              style={uiStyle(s.keep)}
            >
              <Text style={uiTextStyle(s.keepLabel)}>{uiText("Giữ đặt phòng")}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,29,38,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: { padding: 22, paddingBottom: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#FDF0F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#293440', fontSize: 23, lineHeight: 30, fontWeight: '700', marginTop: 18 },
  description: { fontSize: 13, lineHeight: 21, color: '#89939F', marginTop: 9 },
  booking: {
    backgroundColor: '#F6F8FA',
    borderRadius: 10,
    padding: 14,
    marginTop: 19,
    marginBottom: 20,
  },
  bookingTitle: { color: '#3F4B59', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  bookingDates: { color: '#89939F', fontSize: 12, lineHeight: 19, marginTop: 5 },
  reference: { color: '#A0A8B2', fontSize: 10, marginTop: 6 },
  label: { fontSize: 13, color: '#4B5765', fontWeight: '600', marginBottom: 9 },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#DCE2E9',
    borderRadius: 9,
    backgroundColor: '#FBFCFD',
    padding: 12,
    color: '#3F4B59',
    fontSize: 13,
    lineHeight: 20,
  },
  counter: { color: '#A5ADB6', fontSize: 10, textAlign: 'right', marginTop: 5 },
  refund: {
    backgroundColor: '#FFFAEE',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 9,
    marginTop: 17,
  },
  refundTitle: { fontSize: 12, fontWeight: '600', color: '#9C7739' },
  refundCopy: { color: '#AD9469', fontSize: 11, lineHeight: 18, marginTop: 5 },
  error: { color: '#C54F5D', fontSize: 12, lineHeight: 19, marginTop: 9 },
  actions: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14 },
  confirm: {
    minHeight: 45,
    borderRadius: 9,
    backgroundColor: '#E66471',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: { fontSize: 14, fontWeight: '600', color: 'white' },
  keep: { minHeight: 43, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  keepLabel: { fontSize: 13, fontWeight: '500', color: '#758290' },
});
