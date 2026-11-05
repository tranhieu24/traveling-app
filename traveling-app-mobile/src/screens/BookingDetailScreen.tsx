import { useUiPreferences, uiStyle, uiText, uiClasses, uiColor, uiTextStyle } from '../preferences/ui';
import { TripProgress } from '../components/booking/TripProgress';
import { AiHelpPanel } from '../components/ai/AiPanels';
import { MediaNotice } from '../components/common/MediaNotice';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { BookingHold } from '../components/booking/BookingHold';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';

export const BookingDetailScreen: React.FC = () => {
  useUiPreferences();
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
          : 'Không thể tải biên lai. Vui lòng thử lại.'
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
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={uiStyle({ flex: 1, backgroundColor: '#FFFFFF' })}
      >
        <Header title={uiText("Chi tiết đặt phòng")} onBack={handleBack} />
        <View className={uiClasses("flex-1 items-center justify-center px-6")}>
          {authLoading || (!!user && isLoading) ? (
            <ActivityIndicator size="large" color={uiColor("#00BCD4")} />
          ) : (
            <>
              <Text className={uiClasses("text-base font-bold text-dark text-center mb-3")}>
                {needsLogin ? uiText('Đăng nhập để xem đơn đặt chỗ') : uiText('Không thể tải đơn đặt chỗ')}
              </Text>
              <Text className={uiClasses("text-sm text-dark-muted text-center mb-4")}>
                {needsLogin ? uiText('Chi tiết đặt chỗ và thanh toán được bảo mật.') : uiText("Vui lòng kiểm tra kết nối rồi thử lại.")}
              </Text>
              <Button
                title={needsLogin ? uiText("Đăng nhập") : uiText("Thử lại")}
                accessibilityRole="button"
                accessibilityLabel={needsLogin ? uiText('Đăng nhập để xem đơn đặt chỗ') : uiText('Tải lại chi tiết đặt chỗ')}
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
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={uiStyle({ flex: 1, backgroundColor: '#FFFFFF' })}
    >
      <Header title={uiText("Chi tiết đặt phòng")} onBack={handleBack} />

      <ScrollView
        style={uiStyle({ flex: 1 })}
        contentContainerStyle={uiStyle({ padding: 20, paddingBottom: 32 })}
        showsVerticalScrollIndicator={false}
      >
        <MediaNotice context={booking.photo_context}/>
        <BookingHold booking={booking} onRefresh={()=>void refetch()} onRebook={()=>navigation.navigate('ListingDetail',{listingId:booking.listing_id})}/>
        {booking.guest_id===user?.id&&<AiHelpPanel bookingId={bookingId}/>}
        {booking.guest_id===user?.id&&<><TripProgress bookingId={bookingId}/><Button title={uiText("Yêu cầu hỗ trợ đơn này")} onPress={()=>navigation.navigate('Support',{bookingId})}/></>}
        {booking.contact_snapshot && <View className={uiClasses("mb-4 p-4 bg-gray-50 rounded-xl")}><Text className={uiClasses("font-bold text-dark mb-2")}>{uiText("Thông tin liên hệ của đơn")}</Text><Text style={uiTextStyle(undefined)}>{uiText(booking.contact_snapshot.fullName)}</Text><Text style={uiTextStyle(undefined)}>{booking.contact_snapshot.email}</Text>{!!booking.contact_snapshot.phone&&<Text style={uiTextStyle(undefined)}>{uiText(booking.contact_snapshot.phone)}</Text>}</View>}
        {isError && (
          <View className={uiClasses("mb-4 p-3 rounded-xl bg-amber-50")}>
            <Text accessibilityRole="alert" className={uiClasses("text-xs text-dark-muted leading-5")}>{uiText("Unable to refresh reservation details. Showing the last confirmed details.")}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={uiText("Retry refreshing reservation")}
              onPress={() => void refetch()}
              className={uiClasses("mt-2 py-2")}
            >
              <Text className={uiClasses("text-xs text-primary font-semibold")}>{uiText("Thử lại")}</Text>
            </Pressable>
          </View>
        )}
        {/* Status Banner */}
        <View
          className={uiClasses(`p-4 rounded-2xl mb-5 flex-row items-center justify-between ${
            isConfirmed ? 'bg-primary-50' : isCancelled ? 'bg-gray-100' : 'bg-amber-50'
          }`)}
        >
          <View>
            <Text
              className={uiClasses(`text-sm font-extrabold uppercase ${
                isConfirmed ? 'text-primary' : isCancelled ? 'text-gray-600' : 'text-amber-700'
              }`)}
            >
              {uiText(booking.booking_status)}
            </Text>
            <Text className={uiClasses("text-xs text-dark-muted mt-0.5")}>{uiText("Code: ")}{uiText(booking.booking_code)}</Text>
          </View>

          {canDownloadReceipt && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={uiText("Download reservation receipt")}
              disabled={receiptBusy}
              onPress={handleOpenReceipt}
              className={uiClasses("flex-row items-center bg-white px-3 py-1.5 rounded-lg border border-primary/30 shadow-sm")}
            >
              <FileText size={14} color={uiColor("#00BCD4")} />
              <Text className={uiClasses("text-xs font-bold text-primary ml-1.5")}>
                {receiptBusy ? uiText("Đang chuẩn bị...") : uiText("Chứng từ PDF")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!!receiptNotice && (
          <Text accessibilityRole="alert" className={uiClasses("text-xs text-red-500 mb-4")}>
            {uiText(receiptNotice)}
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
        <View className={uiClasses("flex-row pb-5 mb-5 border-b border-gray-100")}>
          <Image
            source={{
              uri:
                booking.cover_photo ||
                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
            }}
            className={uiClasses("w-24 h-24 rounded-2xl bg-gray-200 mr-4")}
          />
          <View className={uiClasses("flex-1 justify-center")}>
            <Text className={uiClasses("text-sm font-bold text-dark leading-5 mb-1")} numberOfLines={2}>
              {booking.listing_title}
            </Text>
            <Text className={uiClasses("text-xs text-dark-muted font-medium mb-1")}>
              {uiText(booking.listing_city)}{uiText(", ")}{uiText(booking.listing_country)}
            </Text>
            <Text className={uiClasses("text-xs text-dark font-medium")}>{uiText("Hosted by ")}{uiText(booking.host_name || 'Host')}
            </Text>
          </View>
        </View>

        {/* Timeline Dates */}
        <View className={uiClasses("pb-5 mb-5 border-b border-gray-100")}>
          <Text className={uiClasses("text-base font-bold text-dark mb-3")}>{uiText("Ngày lưu trú")}</Text>
          <View className={uiClasses("flex-row items-center justify-between bg-gray-50 p-4 rounded-xl")}>
            <View>
              <Text className={uiClasses("text-[10px] uppercase font-bold text-dark-muted")}>{uiText("Check-in")}</Text>
              <Text className={uiClasses("text-xs font-bold text-dark mt-0.5")}>
                {uiText(new Date(booking.check_in_date).toDateString())}
              </Text>
            </View>
            <View className={uiClasses("items-center")}>
              <Text className={uiClasses("text-[11px] font-bold text-primary")}>
                {uiText(booking.total_nights)}{uiText(" nights")}</Text>
            </View>
            <View className={uiClasses("items-end")}>
              <Text className={uiClasses("text-[10px] uppercase font-bold text-dark-muted")}>{uiText("Check-out")}</Text>
              <Text className={uiClasses("text-xs font-bold text-dark mt-0.5")}>
                {uiText(new Date(booking.check_out_date).toDateString())}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <View className={uiClasses("pb-5 mb-5 border-b border-gray-100")}>
          <Text className={uiClasses("text-base font-bold text-dark mb-3")}>{uiText("Tóm tắt thanh toán")}</Text>
          <View className={uiClasses("flex-row justify-between mb-1.5")}>
            <Text className={uiClasses("text-xs text-dark")}>{uiText("Giá cơ bản")}</Text>
            <Text className={uiClasses("text-xs font-semibold text-dark")}>{uiText("$")}{uiText(Number(booking.base_price_total || 0).toFixed(2))}
            </Text>
          </View>
          <View className={uiClasses("flex-row justify-between mb-1.5")}>
            <Text className={uiClasses("text-xs text-dark")}>{uiText("Phí vệ sinh")}</Text>
            <Text className={uiClasses("text-xs font-semibold text-dark")}>{uiText("$")}{uiText(Number(booking.cleaning_fee || 0).toFixed(2))}
            </Text>
          </View>
          <View className={uiClasses("flex-row justify-between mb-3")}>
            <Text className={uiClasses("text-xs text-dark")}>{uiText("Phí dịch vụ")}</Text>
            <Text className={uiClasses("text-xs font-semibold text-dark")}>{uiText("$")}{uiText(Number(booking.service_fee || 0).toFixed(2))}
            </Text>
          </View>
          {Number(booking.discount_amount || 0) > 0 && (
            <View className={uiClasses("flex-row justify-between mb-2")}>
              <Text className={uiClasses("text-xs text-dark")}>{uiText("Giảm giá")}</Text>
              <Text className={uiClasses("text-xs font-semibold text-dark")}>{uiText("-$")}{uiText(Number(booking.discount_amount).toFixed(2))}
              </Text>
            </View>
          )}
          {Number(booking.tax_amount || 0) > 0 && (
            <View className={uiClasses("flex-row justify-between mb-3")}>
              <Text className={uiClasses("text-xs text-dark")}>{uiText("Tax")}</Text>
              <Text className={uiClasses("text-xs font-semibold text-dark")}>{uiText("$")}{uiText(Number(booking.tax_amount).toFixed(2))}
              </Text>
            </View>
          )}
          <View className={uiClasses("flex-row justify-between pt-2 border-t border-gray-100")}>
            <Text className={uiClasses("text-sm font-bold text-dark")}>{uiText("Tổng tiền")}</Text>
            <Text className={uiClasses("text-sm font-bold text-primary")}>{uiText("$")}{uiText(Number(booking.total_price || 0).toFixed(2))}
            </Text>
          </View>
        </View>

        {Number(booking.amount_paid || 0) > 0 && (
          <View className={uiClasses("pb-5 mb-5 border-b border-gray-100")}>
            <View className={uiClasses("flex-row justify-between mb-2")}>
              <Text className={uiClasses("text-xs text-dark")}>{uiText("Đã thanh toán")}</Text>
              <Text className={uiClasses("text-xs font-semibold text-dark")}>{uiText("$")}{uiText(Number(booking.amount_paid).toFixed(2))}
              </Text>
            </View>
            {!isCancelled && booking.booking_status !== 'expired' && (
              <View className={uiClasses("flex-row justify-between")}>
                <Text className={uiClasses("text-xs text-dark")}>{uiText("Số tiền còn lại")}</Text>
                <Text className={uiClasses("text-xs font-semibold text-primary")}>{uiText("$")}{uiText(Number(booking.balance_due || 0).toFixed(2))}
                </Text>
              </View>
            )}
            {Number(booking.amount_refunded || 0) > 0 && (
              <View className={uiClasses("flex-row justify-between mt-2")}>
                <Text className={uiClasses("text-xs text-dark")}>{uiText("Đã hoàn tiền")}</Text>
                <Text className={uiClasses("text-xs font-semibold text-primary")}>{uiText("$")}{uiText(Number(booking.amount_refunded).toFixed(2))}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Host Contact */}
        {booking.host_phone && (
          <View className={uiClasses("pb-5 mb-5 border-b border-gray-100 flex-row items-center justify-between")}>
            <View className={uiClasses("flex-row items-center")}>
              <Phone size={18} color={uiColor("#00BCD4")} />
              <View className={uiClasses("ml-3")}>
                <Text className={uiClasses("text-xs font-bold text-dark")}>{uiText("Liên hệ chủ nhà")}</Text>
                <Text className={uiClasses("text-xs text-dark-muted")}>{uiText(booking.host_phone)}</Text>
              </View>
            </View>
          </View>
        )}

        {paymentAction && (
          <View className={uiClasses("mb-6")}>
            <Button
              title={uiText(paymentAction.label)}
              accessibilityRole="button"
              accessibilityLabel={uiText(paymentAction.label)}
              onPress={() =>
                navigation.navigate("Payment", { bookingId, plan: paymentAction.plan })
              }
            />
          </View>
        )}
        {['pending', 'confirmed'].includes(booking.booking_status) &&
          booking.guest_id === user?.id && (
            <View className={uiClasses("mt-2 mb-6")}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Cancel Reservation")}
                disabled={!eligibility.allowed || isCancelling}
                accessibilityState={{ disabled: !eligibility.allowed || isCancelling }}
                onPress={() => {
                  setCancelError('');
                  setCancelVisible(true);
                }}
                style={uiStyle({
                  minHeight: 46,
                  borderWidth: 1,
                  borderColor: '#EC8390',
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: eligibility.allowed ? 1 : 0.4,
                })}
              >
                <Text style={uiTextStyle({ color: '#D86472', fontSize: 13, fontWeight: '500' })}>{uiText("Hủy đặt phòng")}</Text>
              </Pressable>
              {!eligibility.allowed && (
                <>
                  <Text className={uiClasses("text-xs text-dark-muted leading-5 mt-3")}>
                    {uiText(eligibility.reason)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={uiText("Cancellation support")}
                    onPress={() => navigation.navigate('HelpCenter')}
                    className={uiClasses("mt-2 py-2")}
                  >
                    <Text className={uiClasses("text-xs text-primary font-semibold")}>{uiText("Liên hệ hỗ trợ")}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        {booking.booking_status === 'completed' && booking.guest_id === user?.id && (
          <View className={uiClasses("mb-6")}>
            <Button
              title={uiText("Viết đánh giá")}
              accessibilityRole="button"
              accessibilityLabel={uiText("Review completed stay")}
              onPress={() =>
                navigation.navigate('WriteReview', {
                  listingId: booking.listing_id,
                  listingTitle: booking.listing_title,
                })
              }
              variant="outline"
            />
            <Text className={uiClasses("text-xs text-dark-muted text-center mt-3")}>{uiText("Chia sẻ trải nghiệm sau khi hoàn thành lưu trú.")}</Text>
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
