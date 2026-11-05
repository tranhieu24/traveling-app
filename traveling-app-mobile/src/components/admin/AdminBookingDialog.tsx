import { useUiPreferences, uiStyle, uiTextStyle, uiText, uiColor } from '../../preferences/ui';
import { ArrivalGuideEditor } from './ArrivalGuideEditor';
import { MediaNotice } from '../common/MediaNotice';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { adminGet } from '../../services/admin';
import {
  adminDate,
  adminError,
  adminMoney,
  bookingActions,
  isAdminAccessError,
} from '../../utils/admin';
import type { AdminRecord } from '../../types/admin';
import { a, AdminBadge, AdminButton, AdminEmpty, AdminModal, colors } from './AdminUI';

export function AdminBookingDialog({
  id,
  userId,
  onClose,
  onAction,
  onAccessError,
}: {
  id: string;
  userId: string;
  onClose: () => void;
  onAction: (action: 'confirm' | 'complete' | 'cancel', row: AdminRecord) => void;
  onAccessError: () => void;
}) {
  useUiPreferences();
  const query = useQuery({
    queryKey: ['admin', userId, 'booking', id],
    queryFn: ({ signal }) => adminGet('bookings', id, signal),
    retry: false,
  });
  useEffect(() => {
    if (isAdminAccessError(query.error)) onAccessError();
  }, [query.error, onAccessError]);
  const booking = !query.error ? query.data : undefined;
  const allowed = booking ? bookingActions(booking) : null;
  const net = booking ? Number(booking.amount_paid || 0) - Number(booking.amount_refunded || 0) : 0;
  const required = booking
    ? booking.payment_plan === 'deposit'
      ? Math.min(Number(booking.policy_snapshot?.depositAmount ?? 30), Number(booking.total_price))
      : Number(booking.total_price)
    : 0;
  const verified = net + 0.001 >= required;
  const holdValid = booking?.payment_due_at && Date.parse(booking.payment_due_at) > Date.now();
  const line = (label: string, value: string) => (
    <View
      key={label}
      style={uiStyle([a.row, { justifyContent: 'space-between', alignItems: 'flex-start' }])}
    >
      <Text style={uiTextStyle([a.muted, { flex: 1 }])}>{uiText(label)}</Text>
      <Text selectable style={uiTextStyle([a.text, { flex: 1, textAlign: 'right' }])}>
        {uiText(value)}
      </Text>
    </View>
  );
  return (
    <AdminModal
      visible
      title={uiText("Chi tiết đặt phòng")}
      subtitle={booking?.booking_code || 'Đang tải thông tin...'}
      onClose={onClose}
      footer={
        booking && (
          <>
            <AdminButton title={uiText("Đóng")} variant="secondary" onPress={onClose} />
            {allowed?.cancel && (
              <AdminButton
                title={uiText("Hủy đặt phòng")}
                variant="danger"
                onPress={() => onAction('cancel', booking)}
              />
            )}
            {allowed?.confirm && (
              <AdminButton
                title={uiText("Xác nhận đặt phòng")}
                disabled={!verified || !holdValid}
                onPress={() => onAction('confirm', booking)}
              />
            )}
            {allowed?.complete && (
              <AdminButton
                title={uiText("Đánh dấu hoàn thành")}
                disabled={net + 0.001 < Number(booking.total_price)}
                onPress={() => onAction('complete', booking)}
              />
            )}
          </>
        )
      }
    >
      {query.isLoading ? (
        <ActivityIndicator color={uiColor(colors.primary)} />
      ) : query.error ? (
        <AdminEmpty error={adminError(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        booking && (
          <>
            <View style={uiStyle(a.wrap)}>
              <AdminBadge status={booking.booking_status} />
              <AdminBadge status={booking.payment_status || 'pending'} />
            </View>
            <Text style={uiTextStyle(a.sectionTitle)}>{booking.listing_title}</Text>
            <ArrivalGuideEditor bookingId={id} userId={userId} editable={booking.booking_status==='confirmed'}/>
            <MediaNotice context={booking.photo_context} compact/>
            {booking.contact_snapshot && <View><Text style={uiTextStyle(a.sectionTitle)}>{uiText("Liên hệ của đơn")}</Text>{line('Họ tên',booking.contact_snapshot.fullName)}{line('Email liên hệ',booking.contact_snapshot.email)}{line('Điện thoại',booking.contact_snapshot.phone||'—')}</View>}
            {line('Khách hàng', booking.guest_name || booking.guest_id)}
            {line('Email', booking.guest_email || '—')}
            {line(
              'Nhận / trả phòng',
              `${adminDate(booking.check_in_date)} – ${adminDate(booking.check_out_date)}`
            )}
            {line(
              'Số đêm / số khách',
              `${booking.total_nights} đêm · ${booking.number_of_guests} khách`
            )}
            {line(
              'Địa chỉ',
              booking.listing_address ||
                `${booking.listing_city || ''}, ${booking.listing_country || ''}`
            )}
            {!!booking.special_requests && (
              <View>
                <Text style={uiTextStyle(a.label)}>{uiText("Yêu cầu đặc biệt")}</Text>
                <Text style={uiTextStyle([a.text, { marginTop: 8 }])}>{uiText(booking.special_requests)}</Text>
              </View>
            )}
            <View
              style={uiStyle({ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18, gap: 12 })}
            >
              <Text style={uiTextStyle(a.sectionTitle)}>{uiText("Đối soát thanh toán")}</Text>
              {line('Tổng tiền', adminMoney(booking.total_price))}
              {line('Đã thanh toán', adminMoney(booking.amount_paid))}
              {line('Đã hoàn', adminMoney(booking.amount_refunded))}
              {line('Còn phải thu', adminMoney(booking.balance_due))}
              <Text style={uiTextStyle(a.helper)}>{uiText("Chỉ xác nhận khi đã đủ tiền cho phương án thanh toán và còn thời hạn giữ phòng. Hoàn thành khi đã trả đủ và đến ngày trả phòng (UTC).")}</Text>
              {allowed?.confirm && !verified && (
                <Text style={uiTextStyle([a.text, { color: '#B78A36' }])}>{uiText("Chưa đủ tiền đã xác minh. Cần ít nhất ")}{uiText(adminMoney(required))}{uiText(" để xác nhận.")}</Text>
              )}
              {allowed?.confirm && !holdValid && (
                <Text style={uiTextStyle([a.text, { color: '#B78A36' }])}>{uiText("Thời hạn giữ phòng đã hết hoặc không còn hợp lệ.")}</Text>
              )}
            </View>
            {(booking.payments || []).map((payment: any) => (
              <View key={payment.id} style={uiStyle([a.card, { padding: 13, gap: 8 }])}>
                <View style={uiStyle([a.row, { justifyContent: 'space-between' }])}>
                  <Text style={uiTextStyle(a.text)}>
                    {uiText(adminMoney(payment.amount))}{uiText(" · ")}{uiText(payment.provider || 'Thanh toán')}
                  </Text>
                  <AdminBadge status={payment.payment_status} />
                </View>
                <Text style={uiTextStyle(a.helper)}>
                  {payment.is_simulated ? uiText('Giao dịch mô phỏng · ') : uiText('')}
                  {uiText(payment.transaction_reference || payment.id)}
                </Text>
              </View>
            ))}
            {!!booking.cancellation_reason && (
              <View>
                <Text style={uiTextStyle(a.label)}>{uiText("Lý do hủy")}</Text>
                <Text style={uiTextStyle(a.text)}>{uiText(booking.cancellation_reason)}</Text>
              </View>
            )}
            {(booking.refunds || []).map((refund: any) => (
              <View key={refund.id} style={uiStyle([a.row, { justifyContent: 'space-between' }])}>
                <Text style={uiTextStyle(a.text)}>{uiText("Hoàn ")}{uiText(adminMoney(refund.amount))}</Text>
                <AdminBadge status={refund.status} />
              </View>
            ))}
          </>
        )
      )}
    </AdminModal>
  );
}
