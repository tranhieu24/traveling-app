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
  success: { title: 'Payment success!' },
  pending: { title: 'Payment pending', description: 'Your payment has not been confirmed yet. Check your booking for the current status.' },
  failed: { title: 'Payment not completed', description: 'Your payment was not successful. Open your booking to check the details before trying again.' },
  refunded: { title: 'Payment refunded', description: 'View your booking for the payment and refund history.' },
  cancelled: { title: 'Booking cancelled', description: 'View your booking for its payment and refund status.' },
  expired: { title: 'Booking expired', description: 'The reservation hold has expired. View your booking for details.' },
};

export const BookingSuccessScreen: React.FC = () => {
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
      if (!response.data.success || !response.data.data?.id) throw new Error('Could not load payment details.');
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
      setReceiptMessage('Your receipt is ready to save.');
    } catch (receiptFailure: unknown) {
      setReceiptError(receiptFailure instanceof Error ? receiptFailure.message : 'Could not download your receipt. Please try again.');
    } finally {
      downloadPending.current = false;
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {authLoading || (!!user && isLoading) ? (
            <View style={styles.fallback}>
              <ActivityIndicator size="large" color="#00B8CE" />
              <Text style={styles.fallbackText}>Loading payment details...</Text>
            </View>
          ) : loginRequired ? (
            <View style={styles.fallback}>
              <AlertCircle size={48} color="#00B8CE" />
              <Text accessibilityRole="header" style={styles.fallbackTitle}>View your payment</Text>
              <Text style={styles.fallbackText}>Log in to view your payment details and receipt.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Log in to view payment" onPress={() => navigation.navigate('Login')} style={styles.retryButton}><Text style={styles.retryLabel}>Log in</Text></Pressable>
            </View>
          ) : isError || !summary || !copy ? (
            <View style={styles.fallback}>
              <AlertCircle size={48} color="#9CA3AF" />
              <Text accessibilityRole="header" style={styles.fallbackTitle}>Unable to load payment</Text>
              <Text style={styles.fallbackText}>Please check your connection and try again.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Retry payment details" onPress={() => { void refetch(); }} style={styles.retryButton}><Text style={styles.retryLabel}>Try again</Text></Pressable>
            </View>
          ) : (
            <>
              {summary.state === 'success' ? (
                <Image source={require('../../assets/payment-success.png')} style={styles.successImage} resizeMode="contain" accessibilityLabel="Payment completed" />
              ) : (
                <View style={styles.statusIllustration}>
                  {summary.state === 'pending' ? <Clock3 size={64} color="#00B8CE" strokeWidth={1.6} /> : summary.state === 'refunded' ? <RotateCcw size={64} color="#00B8CE" strokeWidth={1.6} /> : <AlertCircle size={64} color="#D98A33" strokeWidth={1.6} />}
                </View>
              )}
              <Text accessibilityRole="header" style={[styles.title, width < 360 && styles.smallTitle]}>{copy.title}</Text>
              {!!copy.description && <Text style={styles.description}>{copy.description}</Text>}
              <View style={styles.details}>
                <View style={styles.detailRow}><Text style={styles.label}>{summary.state === 'pending' ? 'Booking ref' : 'Ref number'}</Text><Text selectable style={styles.value}>{summary.reference || bookingCode || '--'}</Text></View>
                <View style={styles.detailRow}><Text style={styles.label}>Date</Text><Text style={styles.value}>{summary.dateLabel}</Text></View>
                <View style={styles.detailRow}><Text style={styles.label}>Time</Text><Text style={styles.value}>{summary.timeLabel}</Text></View>
                <View style={styles.detailRow}><Text style={styles.label}>Payment method</Text><Text style={styles.value}>{summary.paymentMethod}</Text></View>
              </View>
              <View style={styles.amountRow}><Text style={styles.label}>{summary.state === 'pending' ? 'Amount due' : 'Amount'}</Text><Text style={styles.amount}>{summary.amountLabel}</Text></View>
              {summary.state === 'success' && !!summary.balanceLabel && <Text style={styles.balance}>Remaining balance: {summary.balanceLabel}</Text>}
              {summary.isTestPayment && <Text style={styles.testPayment}>Test payment - No real charge</Text>}
              {canContinuePayment && (
                <Pressable accessibilityRole="button" accessibilityLabel="Continue payment" onPress={() => navigation.replace('Payment', { bookingId })} style={styles.continuePaymentButton}>
                  <Text style={styles.viewBookingLabel}>Continue payment</Text>
                </Pressable>
              )}
              <Pressable
                cssInterop={false}
                accessibilityRole="button" accessibilityLabel="Get PDF receipt"
                accessibilityState={{ disabled: !summary.canDownloadReceipt || downloading, busy: downloading }}
                disabled={!summary.canDownloadReceipt || downloading} onPress={handleReceipt}
                style={({ pressed }) => [styles.receiptButton, !summary.canDownloadReceipt && styles.disabled, pressed && styles.pressed]}
              >
                {downloading ? <ActivityIndicator size="small" color="#7A8089" /> : <Download size={19} color="#8C929A" strokeWidth={2} />}
                <Text style={styles.receiptLabel}>{downloading ? 'Preparing receipt...' : 'Get PDF receipt'}</Text>
              </Pressable>
              {!!receiptError && <Text accessibilityRole="alert" style={styles.receiptError}>{receiptError}</Text>}
              {!!receiptMessage && <Text accessibilityLiveRegion="polite" style={styles.receiptMessage}>{receiptMessage}</Text>}
            </>
          )}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          cssInterop={false}
          accessibilityRole="button" accessibilityLabel="View booking" disabled={!user || authLoading}
          onPress={() => navigation.reset({
            index: 1,
            routes: [
              { name: 'MainTabs', params: { screen: 'BookingsTab' } },
              { name: 'BookingDetail', params: { bookingId } },
            ],
          })}
          style={({ pressed }) => [styles.viewBookingButton, (!user || authLoading) && styles.disabled, pressed && styles.pressed]}
        ><Text style={styles.viewBookingLabel}>View booking</Text></Pressable>
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
