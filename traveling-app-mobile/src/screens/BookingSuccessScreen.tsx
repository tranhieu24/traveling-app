import { useUiPreferences, uiStyle, uiColor, uiTextStyle, uiText } from '../preferences/ui';
import { MediaNotice } from '../components/common/MediaNotice';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AlertCircle, Clock3, Download, RotateCcw } from 'lucide-react-native';
import { Booking, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { downloadBookingReceipt } from '../services/bookingReceipt';
import { getPaymentSummary, PaymentConfirmationState } from '../utils/paymentSummary';

const STATUS_COPY: Record<PaymentConfirmationState, { title: string; description?: string }> = {
  success: { title: "Đã ghi nhận thanh toán!" },
  pending: { title: 'Đang chờ xác nhận', description: 'Thanh toán chưa được xác nhận. Hãy kiểm tra đơn đặt chỗ để xem trạng thái hiện tại.' },
  failed: { title: 'Thanh toán chưa hoàn tất', description: 'Thanh toán không thành công. Hãy mở đơn đặt chỗ để kiểm tra chi tiết trước khi thử lại.' },
  refunded: { title: 'Đã hoàn tiền', description: 'Xem đơn đặt chỗ để kiểm tra lịch sử thanh toán và hoàn tiền.' },
  cancelled: { title: 'Đặt phòng đã hủy', description: 'Xem đơn đặt chỗ để kiểm tra trạng thái thanh toán và hoàn tiền.' },
  expired: { title: 'Đặt phòng đã hết hạn', description: 'Thời gian giữ chỗ đã hết. Hãy xem đơn đặt chỗ để biết chi tiết.' },
};

export const BookingSuccessScreen: React.FC = () => {
  useUiPreferences();
  const route = useRoute<RouteProp<RootStackParamList, 'BookingSuccess'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bookingId, bookingCode } = route.params;
  const { user, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const [downloading, setDownloading] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [receiptMessage, setReceiptMessage] = useState('');
  const downloadPending = useRef(false);
  const { data: booking, isLoading, isError, error, refetch } = useQuery<Booking>({
    queryKey: ['booking_detail', bookingId, user?.id],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      const response = await apiClient.get(`/bookings/${encodeURIComponent(bookingId)}`);
      if (!response.data.success || !response.data.data?.id) throw new Error('Không thể tải chi tiết thanh toán.');
      return response.data.data;
    },
  });
  const summary = booking ? getPaymentSummary(booking) : null;
  const copy = summary ? STATUS_COPY[summary.state] : null;
  const loginRequired = !authLoading && (!user || (axios.isAxiosError(error) && error.response?.status === 401));

  const canContinuePayment = !!booking && !!summary && ['pending', 'failed'].includes(summary.state) && ['pending', 'confirmed'].includes(booking.booking_status);

  const handleReceipt = async () => {
    if (downloadPending.current || !summary?.canDownloadReceipt || !booking) return;
    downloadPending.current = true;
    setDownloading(true);
    setReceiptError('');
    setReceiptMessage('');
    try {
      await downloadBookingReceipt(bookingId, booking.booking_code || bookingCode || bookingId);
      setReceiptMessage('Biên lai đã sẵn sàng để lưu.');
    } catch (receiptFailure: unknown) {
      setReceiptError(receiptFailure instanceof Error ? receiptFailure.message : 'Không thể tải biên lai. Vui lòng thử lại.');
    } finally {
      downloadPending.current = false;
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={uiStyle(styles.screen)}>
      <ScrollView style={uiStyle(styles.scroll)} contentContainerStyle={uiStyle(styles.content)}>
        <View style={uiStyle(styles.card)}>
          {authLoading || (!!user && isLoading) ? (
            <View style={uiStyle(styles.fallback)}>
              <ActivityIndicator size="large" color={uiColor("#00B8CE")} />
              <Text style={uiTextStyle(styles.fallbackText)}>{uiText("Đang tải thông tin thanh toán...")}</Text>
            </View>
          ) : loginRequired ? (
            <View style={uiStyle(styles.fallback)}>
              <AlertCircle size={48} color={uiColor("#00B8CE")} />
              <Text accessibilityRole="header" style={uiTextStyle(styles.fallbackTitle)}>{uiText("Xem thanh toán của bạn")}</Text>
              <Text style={uiTextStyle(styles.fallbackText)}>{uiText("Đăng nhập để xem chi tiết thanh toán và biên lai.")}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={uiText("Đăng nhập để xem thanh toán")} onPress={() => navigation.navigate('Login')} style={uiStyle(styles.retryButton)}><Text style={uiTextStyle(styles.retryLabel)}>{uiText("Đăng nhập")}</Text></Pressable>
            </View>
          ) : isError || !summary || !copy ? (
            <View style={uiStyle(styles.fallback)}>
              <AlertCircle size={48} color={uiColor("#9CA3AF")} />
              <Text accessibilityRole="header" style={uiTextStyle(styles.fallbackTitle)}>{uiText("Chưa tải được thanh toán")}</Text>
              <Text style={uiTextStyle(styles.fallbackText)}>{uiText("Vui lòng kiểm tra kết nối rồi thử lại.")}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={uiText("Tải lại chi tiết thanh toán")} onPress={() => { void refetch(); }} style={uiStyle(styles.retryButton)}><Text style={uiTextStyle(styles.retryLabel)}>{uiText("Thử lại")}</Text></Pressable>
            </View>
          ) : (
            <>
              {summary.state === 'success' ? (
                <Image source={require('../../assets/payment-success.png')} style={uiStyle(styles.successImage)} resizeMode="contain" accessibilityLabel={uiText("Thanh toán hoàn tất")} />
              ) : (
                <View style={uiStyle(styles.statusIllustration)}>
                  {summary.state === 'pending' ? <Clock3 size={64} color={uiColor("#00B8CE")} strokeWidth={1.6} /> : summary.state === 'refunded' ? <RotateCcw size={64} color={uiColor("#00B8CE")} strokeWidth={1.6} /> : <AlertCircle size={64} color={uiColor("#D98A33")} strokeWidth={1.6} />}
                </View>
              )}
              <Text accessibilityRole="header" style={uiTextStyle([styles.title, width < 360 && styles.smallTitle])}>{uiText(copy.title)}</Text>
              {!!copy.description && <Text style={uiTextStyle(styles.description)}>{uiText(copy.description)}</Text>}
              <View style={uiStyle(styles.details)}>
                <View style={uiStyle(styles.detailRow)}><Text style={uiTextStyle(styles.label)}>{summary.state === 'pending' ? uiText("Mã đặt phòng") : uiText("Mã giao dịch")}</Text><Text selectable style={uiTextStyle(styles.value)}>{uiText(summary.reference || bookingCode || '--')}</Text></View>
                <View style={uiStyle(styles.detailRow)}><Text style={uiTextStyle(styles.label)}>{uiText("Ngày")}</Text><Text style={uiTextStyle(styles.value)}>{uiText(summary.dateLabel)}</Text></View>
                <View style={uiStyle(styles.detailRow)}><Text style={uiTextStyle(styles.label)}>{uiText("Thời gian")}</Text><Text style={uiTextStyle(styles.value)}>{uiText(summary.timeLabel)}</Text></View>
                <View style={uiStyle(styles.detailRow)}><Text style={uiTextStyle(styles.label)}>{uiText("Phương thức thanh toán")}</Text><Text style={uiTextStyle(styles.value)}>{uiText(summary.paymentMethod)}</Text></View>
              </View>
              <MediaNotice context={booking?.photo_context} compact/>
              <View style={uiStyle(styles.amountRow)}><Text style={uiTextStyle(styles.label)}>{summary.state === 'pending' ? uiText("Số tiền cần trả") : uiText("Số tiền")}</Text><Text style={uiTextStyle(styles.amount)}>{uiText(summary.amountLabel)}</Text></View>
              {summary.state === 'success' && !!summary.balanceLabel && <Text style={uiTextStyle(styles.balance)}>{uiText("Số dư còn lại: ")}{uiText(summary.balanceLabel)}</Text>}
              {summary.isTestPayment && <Text style={uiTextStyle(styles.testPayment)}>{uiText("Giao dịch test - không trừ tiền thật")}</Text>}
              {canContinuePayment && (
                <Pressable accessibilityRole="button" accessibilityLabel={uiText("Tiếp tục thanh toán")} onPress={() => navigation.replace("Payment", { bookingId })} style={uiStyle(styles.continuePaymentButton)}>
                  <Text style={uiTextStyle(styles.viewBookingLabel)}>{uiText("Tiếp tục thanh toán")}</Text>
                </Pressable>
              )}
              <Pressable
                cssInterop={false}
                accessibilityRole="button" accessibilityLabel={uiText("Tải biên lai PDF")}
                accessibilityState={{ disabled: !summary.canDownloadReceipt || downloading, busy: downloading }}
                disabled={!summary.canDownloadReceipt || downloading} onPress={handleReceipt}
                style={uiStyle(({ pressed }) => [styles.receiptButton, !summary.canDownloadReceipt && styles.disabled, pressed && styles.pressed])}
              >
                {downloading ? <ActivityIndicator size="small" color={uiColor("#7A8089")} /> : <Download size={19} color={uiColor("#8C929A")} strokeWidth={2} />}
                <Text style={uiTextStyle(styles.receiptLabel)}>{downloading ? uiText("Đang chuẩn bị chứng từ...") : uiText("Tải chứng từ PDF")}</Text>
              </Pressable>
              {!!receiptError && <Text accessibilityRole="alert" style={uiTextStyle(styles.receiptError)}>{uiText(receiptError)}</Text>}
              {!!receiptMessage && <Text accessibilityLiveRegion="polite" style={uiTextStyle(styles.receiptMessage)}>{uiText(receiptMessage)}</Text>}
            </>
          )}
        </View>
      </ScrollView>
      <View style={uiStyle(styles.footer)}>
        <Pressable
          cssInterop={false}
          accessibilityRole="button" accessibilityLabel={uiText("Xem đơn đặt chỗ")} disabled={!user || authLoading}
          onPress={() => navigation.reset({
            index: 1,
            routes: [
              { name: 'MainTabs', params: { screen: 'BookingsTab' } },
              { name: 'BookingDetail', params: { bookingId } },
            ],
          })}
          style={uiStyle(({ pressed }) => [styles.viewBookingButton, (!user || authLoading) && styles.disabled, pressed && styles.pressed])}
        ><Text style={uiTextStyle(styles.viewBookingLabel)}>{uiText("Xem đặt phòng")}</Text></Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 118, paddingBottom: 42 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 11, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, paddingTop: 96, paddingBottom: 34 },
  successImage: { position: 'absolute', top: -91, width: 180, height: 180, alignSelf: 'center' },
  statusIllustration: { position: 'absolute', top: -52, width: 116, height: 116, borderRadius: 58, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E1F9FC' },
  title: { color: '#202427', fontSize: 32, lineHeight: 40, fontWeight: '700', textAlign: 'center', marginBottom: 26 },
  smallTitle: { fontSize: 26, lineHeight: 34 },
  description: { color: '#73777E', fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: -12, marginBottom: 18, paddingHorizontal: 4 },
  details: { paddingBottom: 10 },
  detailRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 4 },
  label: { color: '#686C70', fontSize: 14, lineHeight: 21 },
  value: { flexShrink: 1, maxWidth: '65%', textAlign: 'right', color: '#373B3F', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F1F3', paddingTop: 14, paddingBottom: 2 },
  amount: { color: '#373B3F', fontSize: 15, lineHeight: 22, fontWeight: '700' },
  balance: { color: '#73777E', textAlign: 'right', fontSize: 12, lineHeight: 19, marginTop: 8 },
  testPayment: { color: '#9AA0A8', textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 10 },
  continuePaymentButton: { minHeight: 46, borderRadius: 8, backgroundColor: '#00B8CE', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  receiptButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#A2A8AF', borderRadius: 5, marginTop: 28 },
  receiptLabel: { color: '#8C929A', fontSize: 16, lineHeight: 22, fontWeight: '500' },
  receiptError: { color: '#C53D3D', fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 12 },
  receiptMessage: { color: '#268443', fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 12 },
  footer: { width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  viewBookingButton: { minHeight: 46, borderRadius: 8, backgroundColor: '#00B8CE', alignItems: 'center', justifyContent: 'center' },
  viewBookingLabel: { color: '#FFFFFF', fontSize: 16, lineHeight: 23, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  fallback: { alignItems: 'center', paddingTop: 4, paddingBottom: 24, paddingHorizontal: 8 },
  fallbackTitle: { fontSize: 24, lineHeight: 32, fontWeight: '700', textAlign: 'center', color: '#292C30', marginTop: 20 },
  fallbackText: { fontSize: 14, lineHeight: 22, textAlign: 'center', color: '#73777E', marginTop: 16 },
  retryButton: { minHeight: 44, paddingHorizontal: 26, borderRadius: 8, borderWidth: 1, borderColor: '#00B8CE', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  retryLabel: { fontSize: 14, fontWeight: '600', color: '#008D9F' },
});
