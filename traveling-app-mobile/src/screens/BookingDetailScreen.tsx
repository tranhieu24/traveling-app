import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { FileText, Phone } from 'lucide-react-native';
import { Booking, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  fetchReservation,
  cancelReservation,
  cancellationErrorMessage,
} from '../services/reservationCancellation';
import { downloadBookingReceipt } from '../services/bookingReceipt';
import { getPaymentSummary } from '../utils/paymentSummary';
import { getAccountPaymentAction } from '../utils/paymentAccount';
import {
  cancellationEligibility,
  validateCancellationReason,
} from '../utils/reservationCancellation';
import { CancelReservationModal } from '../components/booking/CancelReservationModal';
import { CancellationStatus } from '../components/booking/CancellationStatus';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';

export const BookingDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'BookingDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { bookingId } = route.params;

  const { user, token, isLoading: authLoading } = useAuth();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [forceLogin, setForceLogin] = useState(false);
  useEffect(() => {
    setForceLogin(false);
  }, [user?.id, token]);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptNotice, setReceiptNotice] = useState('');
  const cancelPending = useRef(false),
    receiptPending = useRef(false);
  const detailKey = ['booking_detail', bookingId, user?.id];
  const handleBack = () => {
    if (cancelPending.current) return;
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('MainTabs', { screen: 'BookingsTab' });
  };
  const {
    data: booking,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Booking>({
    queryKey: detailKey,
    queryFn: ({ signal }) => fetchReservation(bookingId, signal),
    enabled: !authLoading && !!user,
    retry: (count, failure) =>
      !(axios.isAxiosError(failure) && failure.response?.status === 401) && count < 1,
  });
  const handleOpenReceipt = async () => {
    if (!booking || receiptPending.current || !getPaymentSummary(booking).canDownloadReceipt)
      return;
    receiptPending.current = true;
    setReceiptBusy(true);
    setReceiptNotice('');
    try {
      await downloadBookingReceipt(bookingId, booking.booking_code);
    } catch (failure) {
      setReceiptNotice(
        failure instanceof Error
          ? failure.message
          : 'Could not download your receipt. Please try again.'
      );
    } finally {
      receiptPending.current = false;
      setReceiptBusy(false);
    }
  };
  const handleCancelBooking = async (value: string) => {
    if (!booking || !user || cancelPending.current) return;
    try {
      validateCancellationReason(value);
      const eligibility = cancellationEligibility(booking, user.id);
      if (!eligibility.allowed) throw new Error(eligibility.reason);
    } catch (failure) {
      setCancelError(cancellationErrorMessage(failure));
      return;
    }
    cancelPending.current = true;
    setIsCancelling(true);
    setCancelError('');
    try {
      const result = await cancelReservation(bookingId, value);
      const refunds = [
        ...new Map(
          [...(booking.refunds || []), ...result.refunds].map((refund) => [refund.id, refund])
        ).values(),
      ];
      const updated = result.detail || { ...booking, ...result.booking, refunds };
      queryClient.setQueryData(detailKey, updated);
      setRefreshFailed(!result.detail);
      setCancelVisible(false);
      void queryClient.invalidateQueries({
        queryKey: ['booking_detail', bookingId],
        refetchType: 'none',
      });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my_bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
        queryClient.invalidateQueries({ queryKey: ['search_results'] }),
        queryClient.invalidateQueries({ queryKey: ['listing_detail', booking.listing_id] }),
      ]);
    } catch (failure) {
      if (axios.isAxiosError(failure) && failure.response?.status === 401) {
        setCancelVisible(false);
        setForceLogin(true);
      } else {
        setCancelError(cancellationErrorMessage(failure));
        void refetch();
      }
    } finally {
      cancelPending.current = false;
      setIsCancelling(false);
    }
  };
  const needsLogin =
    !authLoading &&
    (!user || forceLogin || (axios.isAxiosError(error) && error.response?.status === 401));
  const cannotShowDetails =
    isError &&
    (!booking || (axios.isAxiosError(error) && [403, 404].includes(error.response?.status || 0)));
  if (authLoading || (!!user && isLoading) || needsLogin || cannotShowDetails || !booking) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Header title="Reservation Details" onBack={handleBack} />
        <View className="flex-1 items-center justify-center px-6">
          {authLoading || (!!user && isLoading) ? (
            <ActivityIndicator size="large" color="#00BCD4" />
          ) : (
            <>
              <Text className="text-base font-bold text-dark text-center mb-3">
                {needsLogin ? 'Log in to view this reservation' : 'Unable to load reservation'}
              </Text>
              <Text className="text-sm text-dark-muted text-center mb-4">
                {needsLogin
                  ? 'Reservation and payment details are private.'
                  : 'Please check your connection and try again.'}
              </Text>
              <Button
                title={needsLogin ? 'Log in' : 'Try again'}
                accessibilityRole="button"
                accessibilityLabel={
                  needsLogin ? 'Log in to view reservation' : 'Retry reservation details'
                }
                onPress={() => (needsLogin ? navigation.navigate('Login') : void refetch())}
                variant="outline"
              />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }
  const eligibility = cancellationEligibility(booking, user?.id);
  const paymentAction = getAccountPaymentAction(booking);
  const canDownloadReceipt = getPaymentSummary(booking).canDownloadReceipt;
  const isConfirmed = booking.booking_status === 'confirmed';
  const isCancelled = booking.booking_status === 'cancelled';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Reservation Details" onBack={handleBack} />

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {isError && (
          <View className="mb-4 p-3 rounded-xl bg-amber-50">
            <Text accessibilityRole="alert" className="text-xs text-dark-muted leading-5">
              Unable to refresh reservation details. Showing the last confirmed details.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry refreshing reservation"
              onPress={() => void refetch()}
              className="mt-2 py-2"
            >
              <Text className="text-xs text-primary font-semibold">Try again</Text>
            </Pressable>
          </View>
        )}
        {/* Status Banner */}
        <View
          className={`p-4 rounded-2xl mb-5 flex-row items-center justify-between ${
            isConfirmed ? 'bg-primary-50' : isCancelled ? 'bg-gray-100' : 'bg-amber-50'
          }`}
        >
          <View>
            <Text
              className={`text-sm font-extrabold uppercase ${
                isConfirmed ? 'text-primary' : isCancelled ? 'text-gray-600' : 'text-amber-700'
              }`}
            >
              {booking.booking_status}
            </Text>
            <Text className="text-xs text-dark-muted mt-0.5">Code: {booking.booking_code}</Text>
          </View>

          {canDownloadReceipt && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Download reservation receipt"
              disabled={receiptBusy}
              onPress={handleOpenReceipt}
              className="flex-row items-center bg-white px-3 py-1.5 rounded-lg border border-primary/30 shadow-sm"
            >
              <FileText size={14} color="#00BCD4" />
              <Text className="text-xs font-bold text-primary ml-1.5">
                {receiptBusy ? 'Preparing...' : 'PDF Receipt'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!!receiptNotice && (
          <Text accessibilityRole="alert" className="text-xs text-red-500 mb-4">
            {receiptNotice}
          </Text>
        )}
        {isCancelled && (
          <CancellationStatus
            booking={booking}
            refreshFailed={refreshFailed}
            onRefresh={() => {
              void refetch().then((result) => {
                if (result.isSuccess) setRefreshFailed(false);
              });
            }}
            onTrack={() => navigation.navigate('PaymentsPayouts', { tab: 'payouts' })}
          />
        )}

        {/* Accommodation Info Card */}
        <View className="flex-row pb-5 mb-5 border-b border-gray-100">
          <Image
            source={{
              uri:
                booking.cover_photo ||
                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
            }}
            className="w-24 h-24 rounded-2xl bg-gray-200 mr-4"
          />
          <View className="flex-1 justify-center">
            <Text className="text-sm font-bold text-dark leading-5 mb-1" numberOfLines={2}>
              {booking.listing_title}
            </Text>
            <Text className="text-xs text-dark-muted font-medium mb-1">
              {booking.listing_city}, {booking.listing_country}
            </Text>
            <Text className="text-xs text-dark font-medium">
              Hosted by {booking.host_name || 'Host'}
            </Text>
          </View>
        </View>

        {/* Timeline Dates */}
        <View className="pb-5 mb-5 border-b border-gray-100">
          <Text className="text-base font-bold text-dark mb-3">Reservation Dates</Text>
          <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-xl">
            <View>
              <Text className="text-[10px] uppercase font-bold text-dark-muted">Check-in</Text>
              <Text className="text-xs font-bold text-dark mt-0.5">
                {new Date(booking.check_in_date).toDateString()}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-[11px] font-bold text-primary">
                {booking.total_nights} nights
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] uppercase font-bold text-dark-muted">Check-out</Text>
              <Text className="text-xs font-bold text-dark mt-0.5">
                {new Date(booking.check_out_date).toDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <View className="pb-5 mb-5 border-b border-gray-100">
          <Text className="text-base font-bold text-dark mb-3">Payment Summary</Text>
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-xs text-dark">Base Price</Text>
            <Text className="text-xs font-semibold text-dark">
              ${Number(booking.base_price_total || 0).toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-xs text-dark">Cleaning Fee</Text>
            <Text className="text-xs font-semibold text-dark">
              ${Number(booking.cleaning_fee || 0).toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between mb-3">
            <Text className="text-xs text-dark">Service Fee</Text>
            <Text className="text-xs font-semibold text-dark">
              ${Number(booking.service_fee || 0).toFixed(2)}
            </Text>
          </View>
          {Number(booking.discount_amount || 0) > 0 && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs text-dark">Discount</Text>
              <Text className="text-xs font-semibold text-dark">
                -${Number(booking.discount_amount).toFixed(2)}
              </Text>
            </View>
          )}
          {Number(booking.tax_amount || 0) > 0 && (
            <View className="flex-row justify-between mb-3">
              <Text className="text-xs text-dark">Tax</Text>
              <Text className="text-xs font-semibold text-dark">
                ${Number(booking.tax_amount).toFixed(2)}
              </Text>
            </View>
          )}
          <View className="flex-row justify-between pt-2 border-t border-gray-100">
            <Text className="text-sm font-bold text-dark">Total Amount</Text>
            <Text className="text-sm font-bold text-primary">
              ${Number(booking.total_price || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {Number(booking.amount_paid || 0) > 0 && (
          <View className="pb-5 mb-5 border-b border-gray-100">
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs text-dark">Amount paid</Text>
              <Text className="text-xs font-semibold text-dark">
                ${Number(booking.amount_paid).toFixed(2)}
              </Text>
            </View>
            {!isCancelled && booking.booking_status !== 'expired' && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-dark">Remaining balance</Text>
                <Text className="text-xs font-semibold text-primary">
                  ${Number(booking.balance_due || 0).toFixed(2)}
                </Text>
              </View>
            )}
            {Number(booking.amount_refunded || 0) > 0 && (
              <View className="flex-row justify-between mt-2">
                <Text className="text-xs text-dark">Amount refunded</Text>
                <Text className="text-xs font-semibold text-primary">
                  ${Number(booking.amount_refunded).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Host Contact */}
        {booking.host_phone && (
          <View className="pb-5 mb-5 border-b border-gray-100 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Phone size={18} color="#00BCD4" />
              <View className="ml-3">
                <Text className="text-xs font-bold text-dark">Host Contact</Text>
                <Text className="text-xs text-dark-muted">{booking.host_phone}</Text>
              </View>
            </View>
          </View>
        )}

        {paymentAction && (
          <View className="mb-6">
            <Button
              title={paymentAction.label}
              accessibilityRole="button"
              accessibilityLabel={paymentAction.label}
              onPress={() =>
                navigation.navigate('Payment', { bookingId, plan: paymentAction.plan })
              }
            />
          </View>
        )}
        {['pending', 'confirmed'].includes(booking.booking_status) &&
          booking.guest_id === user?.id && (
            <View className="mt-2 mb-6">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel Reservation"
                disabled={!eligibility.allowed || isCancelling}
                accessibilityState={{ disabled: !eligibility.allowed || isCancelling }}
                onPress={() => {
                  setCancelError('');
                  setCancelVisible(true);
                }}
                style={{
                  minHeight: 46,
                  borderWidth: 1,
                  borderColor: '#EC8390',
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: eligibility.allowed ? 1 : 0.4,
                }}
              >
                <Text style={{ color: '#D86472', fontSize: 13, fontWeight: '500' }}>
                  Cancel Reservation
                </Text>
              </Pressable>
              {!eligibility.allowed && (
                <>
                  <Text className="text-xs text-dark-muted leading-5 mt-3">
                    {eligibility.reason}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancellation support"
                    onPress={() => navigation.navigate('HelpCenter')}
                    className="mt-2 py-2"
                  >
                    <Text className="text-xs text-primary font-semibold">Contact support</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        {booking.booking_status === 'completed' && booking.guest_id === user?.id && (
          <View className="mb-6">
            <Button
              title="Write a Review"
              accessibilityRole="button"
              accessibilityLabel="Review completed stay"
              onPress={() =>
                navigation.navigate('WriteReview', {
                  listingId: booking.listing_id,
                  listingTitle: booking.listing_title,
                })
              }
              variant="outline"
            />
            <Text className="text-xs text-dark-muted text-center mt-3">
              Share your experience after your completed stay.
            </Text>
          </View>
        )}
      </ScrollView>
      <CancelReservationModal
        visible={cancelVisible}
        booking={booking}
        busy={isCancelling}
        error={cancelError}
        onClose={() => {
          if (!cancelPending.current) setCancelVisible(false);
        }}
        onConfirm={(reason) => void handleCancelBooking(reason)}
      />
    </SafeAreaView>
  );
};
