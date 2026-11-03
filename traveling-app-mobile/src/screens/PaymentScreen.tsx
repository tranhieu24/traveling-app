import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, ChevronLeft, CreditCard, LockKeyhole } from 'lucide-react-native';
import axios from 'axios';
import { Booking, PaymentPlan, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { completeBookingPayment, paymentErrorMessage } from '../services/bookingPayment';
import { formatPaymentMoney, getPaymentSummary } from '../utils/paymentSummary';
import { BookingHold } from '../components/booking/BookingHold';
import { StripeCheckout } from '../components/payments/StripeCheckout';
import { bookingPaymentDue, formatTripDates } from '../utils/checkout';

export const PaymentScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, "Payment">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bookingId } = route.params;
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [holdElapsed,setHoldElapsed]=useState(false);
  const pending = useRef(false);
  const { data: booking, isLoading, isError, error, refetch } = useQuery<Booking>({
    queryKey: ['booking_detail', bookingId, user?.id],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      const response = await apiClient.get(`/bookings/${encodeURIComponent(bookingId)}`);
      if (!response.data.success || response.data.data?.id !== bookingId) throw new Error('Chưa tải được thông tin thanh toán.');
      return response.data.data;
    },
  });
  const config = useQuery<{mode:string;publishableKey:string|null}>({queryKey:['payment_config'],queryFn:async()=> (await apiClient.get('/payments/config')).data.data});
  const finishPayment = (updated:Booking) => {
    queryClient.setQueryData(['booking_detail',bookingId,user?.id],updated);
    void queryClient.invalidateQueries({queryKey:['my_bookings']});
    navigation.replace('BookingSuccess',{bookingId,bookingCode:updated.booking_code});
  };
  const requestedPlan = route.params.plan;
  const plan: PaymentPlan = requestedPlan && ['full', 'deposit', 'balance'].includes(requestedPlan) ? requestedPlan : booking?.payment_plan === 'deposit' ? 'deposit' : 'full';
  const summary = booking ? getPaymentSummary(booking) : null;
  const alreadyPaid = !!booking && summary?.state === 'success' && (plan === 'deposit' || Number(booking.balance_due || 0) === 0);
  const payable = !holdElapsed && !!booking && ['pending', 'confirmed'].includes(booking.booking_status) && !alreadyPaid && booking.payment_status !== 'refunded' && Number(booking.balance_due ?? booking.total_price) > 0;
  const dueNow = booking ? bookingPaymentDue(booking, plan) : 0;
  const remaining = booking ? alreadyPaid ? Number(booking.balance_due || 0) : Math.max(0, Number(booking.balance_due ?? booking.total_price) - dueNow) : 0;
  const money = (value: number | string) => formatPaymentMoney(value, 'USD');
  const needsLogin = !authLoading && (!user || axios.isAxiosError(error) && error.response?.status === 401);

  const pay = async () => {
    if (pending.current || !payable || !booking) return;
    pending.current = true;
    setPaying(true);
    setPaymentError('');
    try {
      const updated = await completeBookingPayment(bookingId, plan);
      queryClient.setQueryData(['booking_detail', bookingId, user?.id], updated);
      queryClient.setQueryData(['booking_detail', bookingId], updated);
      void queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
      void queryClient.invalidateQueries({ queryKey: ['listing_detail', updated.listing_id] });
      navigation.replace('BookingSuccess', { bookingId, bookingCode: updated.booking_code });
    } catch (failure) { setPaymentError(paymentErrorMessage(failure)); }
    finally { pending.current = false; setPaying(false); }
  };

  React.useEffect(()=>{if(Platform.OS==='web' && typeof window!=='undefined' && window.location?.search?.includes('payment_intent'))window.history.replaceState({},'',window.location.pathname);},[]);
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại đơn đặt phòng" disabled={paying} onPress={() => navigation.replace('BookingDetail', { bookingId })} style={styles.backButton}><ChevronLeft size={25} color="#90979F" /></Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Thanh toán</Text><View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {authLoading || !!user && isLoading ? <View style={styles.empty}><ActivityIndicator color="#00B8CE" /><Text style={styles.muted}>Đang tải thông tin thanh toán...</Text></View> : needsLogin ? (
          <View style={styles.empty}><LockKeyhole size={36} color="#00A4BA" /><Text style={styles.emptyTitle}>Đăng nhập để tiếp tục</Text><Text style={styles.muted}>Thông tin đặt phòng và thanh toán của bạn được bảo vệ.</Text><Pressable accessibilityRole="button" accessibilityLabel="Đăng nhập để thanh toán" onPress={() => navigation.navigate('Login')} style={styles.outlineButton}><Text style={styles.outlineLabel}>Đăng nhập</Text></Pressable></View>
        ) : isError || !booking ? (
          <View style={styles.empty}><AlertCircle size={36} color="#9CA3AF" /><Text style={styles.emptyTitle}>Chưa tải được thanh toán</Text><Pressable accessibilityRole="button" accessibilityLabel="Tải lại thông tin thanh toán" onPress={() => { void refetch(); }} style={styles.outlineButton}><Text style={styles.outlineLabel}>Thử lại</Text></Pressable></View>
        ) : (
          <>
            <BookingHold booking={booking} onElapsed={setHoldElapsed} onRefresh={()=>void refetch()} onRebook={()=>navigation.replace('ListingDetail',{listingId:booking.listing_id})}/>
            <View style={styles.amountHeader}>
              <Text style={styles.eyebrow}>{alreadyPaid ? "Đã ghi nhận thanh toán" : plan === 'balance' ? "Số tiền còn lại" : "Số tiền cần thanh toán"}</Text>
              <Text style={styles.amount}>{alreadyPaid ? money(booking.amount_paid || 0) : money(dueNow)}</Text>
              <Text style={styles.planLabel}>{plan === 'deposit' ? "Trả cọc trước" : plan === 'balance' ? "Thanh toán phần còn lại" : "Thanh toán toàn bộ"}</Text>
            </View>
            <View style={styles.staySummary}>
              <Text style={styles.stayTitle}>{booking.listing_title}</Text>
              <Text style={styles.muted}>{formatTripDates(booking.check_in_date.slice(0, 10), booking.check_out_date.slice(0, 10))} / {booking.number_of_guests} khách</Text>
              <Text selectable style={styles.reference}>Mã đặt phòng: {booking.booking_code}</Text>
            </View>
            {alreadyPaid ? (
              <View style={styles.notice}><Check size={22} color="#15803D" /><Text style={styles.noticeText}>Khoản thanh toán này đã hoàn tất. Bạn có thể xem chứng từ bên dưới.</Text></View>
            ) : !payable ? (
              <View style={styles.notice}><AlertCircle size={22} color="#C78328" /><Text style={styles.noticeText}>Đơn hiện chưa thể nhận thanh toán. Hãy kiểm tra trạng thái trong chi tiết đặt phòng.</Text></View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
                {config.data?.mode==='mock' && <><View style={styles.card} accessibilityRole="radio" aria-checked={true} accessibilityState={{ checked: true }} accessibilityLabel="Thẻ mô phỏng kết thúc bằng 4242">
                  <View style={styles.cardTop}><CreditCard size={25} color="#008D9F" /><Text style={styles.cardBadge}>THẺ MÔ PHỎNG</Text></View>
                  <Text style={styles.cardNumber}>{'4242   \u2022\u2022\u2022\u2022   \u2022\u2022\u2022\u2022   4242'}</Text>
                  <View style={styles.cardBottom}><Text style={styles.cardCaption}>Thẻ thanh toán</Text><View style={styles.checkBadge}><Check size={13} color="#FFFFFF" /></View></View>
                </View>
                <Text style={styles.mockNote}>Thanh toán mô phỏng, không trừ tiền thật.</Text></>}
                {config.isLoading && <Text style={styles.muted}>Đang kiểm tra cổng thanh toán...</Text>}
                {(config.isError || config.data?.mode==='disabled') && <Text accessibilityRole="alert" style={styles.error}>Cổng thanh toán chưa sẵn sàng. Đơn chưa được thanh toán.</Text>}
                {config.data?.mode==='stripe_test' && (config.data.publishableKey ? <StripeCheckout bookingId={bookingId} plan={plan} publishableKey={config.data.publishableKey} onComplete={finishPayment} onBusy={setPaying}/> : <Text style={styles.error}>Backend chưa cấu hình publishable key Stripe test.</Text>)}
              </>
            )}
            <View style={styles.breakdown}>
              <Text style={styles.sectionTitle}>Tóm tắt thanh toán</Text>
              <View style={styles.priceRow}><Text style={styles.priceLabel}>Tổng chuyến đi (USD)</Text><Text style={styles.priceValue}>{money(booking.total_price)}</Text></View>
              {Number(booking.amount_paid || 0) > 0 && <View style={styles.priceRow}><Text style={styles.priceLabel}>Đã thanh toán</Text><Text style={styles.priceValue}>{money(booking.amount_paid!)}</Text></View>}
              {!alreadyPaid && <View style={styles.priceRow}><Text style={styles.priceLabel}>Cần trả ngay</Text><Text style={styles.priceValue}>{money(dueNow)}</Text></View>}
              <View style={styles.totalRow}><Text style={styles.priceLabel}>Còn lại sau thanh toán</Text><Text style={styles.priceValue}>{money(remaining)}</Text></View>
            </View>
          </>
        )}
      </ScrollView>
      {!!booking && !needsLogin && <View style={styles.footer}>
        {!!paymentError && <Text accessibilityRole="alert" style={styles.error}>{paymentError}</Text>}
        {(!payable || config.data?.mode==='mock') && <Pressable
          accessibilityRole="button" accessibilityLabel={alreadyPaid ? "Xem chứng từ thanh toán" : payable ? 'Thanh toán ngay' : 'Xem trạng thái đặt phòng'} disabled={paying}
          onPress={() => alreadyPaid ? navigation.replace('BookingSuccess', { bookingId, bookingCode: booking.booking_code }) : payable ? pay() : navigation.replace('BookingDetail', { bookingId })}
          style={[styles.payButton, paying && styles.disabled]}
        >{paying && <ActivityIndicator size="small" color="#FFFFFF" />}<Text style={styles.payLabel}>{paying ? "Đang xử lý thanh toán..." : alreadyPaid ? "Xem chứng từ thanh toán" : payable ? `Thanh toán ${money(dueNow)}` : "Xem đặt phòng"}</Text></Pressable>}
        {payable && config.data?.mode==='mock' && <View style={styles.secureRow}><LockKeyhole size={12} color="#9CA3AF" /><Text style={styles.secureText}>Thanh toán mô phỏng - không trừ tiền thật</Text></View>}
      </View>}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { width: '100%', maxWidth: 460, alignSelf: 'center', minHeight: 62, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#3D454C' },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center', padding: 20, paddingBottom: 30 },
  amountHeader: { alignItems: 'center', paddingTop: 12, paddingBottom: 24 },
  eyebrow: { fontSize: 13, color: '#858D95' },
  amount: { fontSize: 42, lineHeight: 54, color: '#252B30', fontWeight: '700', marginTop: 6 },
  planLabel: { fontSize: 13, color: '#008D9F', marginTop: 4 },
  staySummary: { borderWidth: 1, borderColor: '#ECEFF2', borderRadius: 10, padding: 16, marginBottom: 26 },
  stayTitle: { fontSize: 15, fontWeight: '600', color: '#3D454C', marginBottom: 6 },
  muted: { fontSize: 13, lineHeight: 21, color: '#858D95' },
  reference: { fontSize: 11, lineHeight: 19, color: '#9CA3AF', marginTop: 8 },
  sectionTitle: { fontSize: 18, lineHeight: 25, fontWeight: '700', color: '#30363B', marginBottom: 14 },
  card: { borderWidth: 1, borderColor: '#B7EAF1', borderRadius: 14, padding: 20, backgroundColor: '#EDFBFD' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardBadge: { fontSize: 10, color: '#008D9F', letterSpacing: 1, fontWeight: '600' },
  cardNumber: { fontSize: 18, letterSpacing: 1.5, fontWeight: '600', color: '#36565E', marginTop: 24, marginBottom: 20 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCaption: { fontSize: 12, color: '#6D8990' },
  checkBadge: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#00B8CE', alignItems: 'center', justifyContent: 'center' },
  mockNote: { fontSize: 12, lineHeight: 20, color: '#9CA3AF', marginTop: 10 },
  breakdown: { marginTop: 28 },
  priceRow: { minHeight: 30, flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  priceLabel: { fontSize: 13, color: '#858D95' },
  priceValue: { fontSize: 14, fontWeight: '500', color: '#3D454C' },
  totalRow: { minHeight: 42, paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: '#EFF1F3', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  footer: { width: '100%', maxWidth: 460, alignSelf: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  payButton: { minHeight: 48, borderRadius: 8, backgroundColor: '#00B8CE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  payLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secureRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 10 },
  secureText: { fontSize: 11, color: '#9CA3AF' },
  disabled: { opacity: 0.55 },
  error: { fontSize: 12, lineHeight: 20, color: '#C53D3D', marginBottom: 12 },
  empty: { paddingVertical: 60, alignItems: 'center', gap: 16 },
  emptyTitle: { fontSize: 20, color: '#30363B', fontWeight: '600' },
  outlineButton: { minHeight: 44, borderWidth: 1, borderColor: '#00B8CE', borderRadius: 8, paddingHorizontal: 24, justifyContent: 'center', marginTop: 10 },
  outlineLabel: { color: '#008D9F', fontSize: 14, fontWeight: '600' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16, borderRadius: 10, backgroundColor: '#F3FAF7' },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 21, color: '#637A6B' },
});
