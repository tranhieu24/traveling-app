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
      ? Math.min(30, Number(booking.total_price))
      : Number(booking.total_price)
    : 0;
  const verified = net + 0.001 >= required;
  const holdValid = booking?.payment_due_at && Date.parse(booking.payment_due_at) > Date.now();
  const line = (label: string, value: string) => (
    <View
      key={label}
      style={[a.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}
    >
      <Text style={[a.muted, { flex: 1 }]}>{label}</Text>
      <Text selectable style={[a.text, { flex: 1, textAlign: 'right' }]}>
        {value}
      </Text>
    </View>
  );
  return (
    <AdminModal
      visible
      title="Chi tiết đặt phòng"
      subtitle={booking?.booking_code || 'Đang tải thông tin...'}
      onClose={onClose}
      footer={
        booking && (
          <>
            <AdminButton title="Đóng" variant="secondary" onPress={onClose} />
            {allowed?.cancel && (
              <AdminButton
                title="Hủy đặt phòng"
                variant="danger"
                onPress={() => onAction('cancel', booking)}
              />
            )}
            {allowed?.confirm && (
              <AdminButton
                title="Xác nhận đặt phòng"
                disabled={!verified || !holdValid}
                onPress={() => onAction('confirm', booking)}
              />
            )}
            {allowed?.complete && (
              <AdminButton
                title="Đánh dấu hoàn thành"
                disabled={net + 0.001 < Number(booking.total_price)}
                onPress={() => onAction('complete', booking)}
              />
            )}
          </>
        )
      }
    >
      {query.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : query.error ? (
        <AdminEmpty error={adminError(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        booking && (
          <>
            <View style={a.wrap}>
              <AdminBadge status={booking.booking_status} />
              <AdminBadge status={booking.payment_status || 'pending'} />
            </View>
            <Text style={a.sectionTitle}>{booking.listing_title}</Text>
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
                <Text style={a.label}>Yêu cầu đặc biệt</Text>
                <Text style={[a.text, { marginTop: 8 }]}>{booking.special_requests}</Text>
              </View>
            )}
            <View
              style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18, gap: 12 }}
            >
              <Text style={a.sectionTitle}>Đối soát thanh toán</Text>
              {line('Tổng tiền', adminMoney(booking.total_price))}
              {line('Đã thanh toán', adminMoney(booking.amount_paid))}
              {line('Đã hoàn', adminMoney(booking.amount_refunded))}
              {line('Còn phải thu', adminMoney(booking.balance_due))}
              <Text style={a.helper}>
                Chỉ xác nhận khi đã đủ tiền cho phương án thanh toán và còn thời hạn giữ phòng. Hoàn
                thành khi đã trả đủ và đến ngày trả phòng (UTC).
              </Text>
              {allowed?.confirm && !verified && (
                <Text style={[a.text, { color: '#B78A36' }]}>
                  Chưa đủ tiền đã xác minh. Cần ít nhất {adminMoney(required)} để xác nhận.
                </Text>
              )}
              {allowed?.confirm && !holdValid && (
                <Text style={[a.text, { color: '#B78A36' }]}>
                  Thời hạn giữ phòng đã hết hoặc không còn hợp lệ.
                </Text>
              )}
            </View>
            {(booking.payments || []).map((payment: any) => (
              <View key={payment.id} style={[a.card, { padding: 13, gap: 8 }]}>
                <View style={[a.row, { justifyContent: 'space-between' }]}>
                  <Text style={a.text}>
                    {adminMoney(payment.amount)} · {payment.provider || 'Thanh toán'}
                  </Text>
                  <AdminBadge status={payment.payment_status} />
                </View>
                <Text style={a.helper}>
                  {payment.is_simulated ? 'Giao dịch mô phỏng · ' : ''}
                  {payment.transaction_reference || payment.id}
                </Text>
              </View>
            ))}
            {!!booking.cancellation_reason && (
              <View>
                <Text style={a.label}>Lý do hủy</Text>
                <Text style={a.text}>{booking.cancellation_reason}</Text>
              </View>
            )}
            {(booking.refunds || []).map((refund: any) => (
              <View key={refund.id} style={[a.row, { justifyContent: 'space-between' }]}>
                <Text style={a.text}>Hoàn {adminMoney(refund.amount)}</Text>
                <AdminBadge status={refund.status} />
              </View>
            ))}
          </>
        )
      )}
    </AdminModal>
  );
}
