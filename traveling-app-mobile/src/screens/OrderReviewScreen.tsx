import { uiLocale, useUiPreferences, uiStyle, uiText, uiColor, uiTextStyle } from '../preferences/ui';

import { requestLogin } from '../navigation/authReturn';
import { MediaNotice } from '../components/common/MediaNotice';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Edit3, Home, Star, Tag } from 'lucide-react-native';
import { BookingQuote, Listing, RootStackParamList } from '../types';
import { apiClient } from '../services/apiClient';
import { paymentErrorMessage } from '../services/bookingPayment';
import { useAuth } from '../context/AuthContext';
import { useFilterStore } from '../store/useFilterStore';
import { TripDraft, TripEditor } from '../components/booking/TripEditor';
import * as Crypto from 'expo-crypto';
import { storage } from '../utils/storage';
import { theme } from '../theme/tokens';
import { formatPaymentMoney } from '../utils/paymentSummary';
import { formatTripDates, paymentSplit } from '../utils/checkout';

export const OrderReviewScreen: React.FC = () => {
  useUiPreferences();
  const route = useRoute<RouteProp<RootStackParamList, 'OrderReview'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [quote, setQuote] = useState<BookingQuote>(route.params.quote);
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'deposit'>('full');
  const [editor, setEditor] = useState<'dates' | 'guests' | null>(null);
  const [checkingQuote, setCheckingQuote] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [contact, setContact] = useState({ fullName: user?.full_name || '', email: user?.email || '', phone: user?.phone_number || '' });
  const [specialRequests, setSpecialRequests] = useState('');
  const [accepted, setAccepted] = useState(false);

  // Quản lý mã khuyến mãi (Coupon)
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (user) {
      setContact((current) => ({
        ...current,
        fullName: current.fullName || user.full_name,
        email: current.email || user.email,
        phone: current.phone || user.phone_number || '',
      }));
    }
  }, [user?.id]);

  const pending = useRef(false);
  const createdBooking = useRef<{ id: string; booking_code: string } | null>(null);
  const { data: listing } = useQuery<Listing>({
    queryKey: ['listing_detail', quote.listingId, user?.id],
    queryFn: async () => (await apiClient.get(`/listings/${encodeURIComponent(quote.listingId)}`)).data.data,
    staleTime: 60000,
  });
  const money = (value: number | string) => formatPaymentMoney(value, quote.currency || 'USD', uiLocale());
  const partial = paymentSplit(quote.totalPrice, 'deposit', quote.policy?.depositAmount ?? 30);
  const trip: TripDraft = {
    checkInDate: quote.checkInDate,
    checkOutDate: quote.checkOutDate,
    adults: quote.adults ?? Math.max(1, quote.guests - (quote.children || 0)),
    children: quote.children || 0,
  };
  const busy = submitting || checkingQuote || checkingCoupon || authLoading;
  const photo = quote.coverPhoto || listing?.cover_photo || listing?.photos?.[0]?.photo_url;
  const rating = listing && Number.isFinite(Number(listing.rating_avg)) ? Number(listing.rating_avg).toFixed(1) : '--';

  const updateTrip = async (draft: TripDraft) => {
    if (createdBooking.current) throw new Error('Đơn đặt chỗ đã được tạo. Hãy mở chi tiết đơn để tiếp tục.');
    setCheckingQuote(true);
    try {
      const response = await apiClient.post('/bookings/quote', {
        listingId: quote.listingId,
        checkInDate: draft.checkInDate,
        checkOutDate: draft.checkOutDate,
        guests: draft.adults + draft.children,
        couponCode: appliedCoupon || undefined,
      });
      const updated = response.data.data as BookingQuote;
      if (!response.data.success || updated?.listingId !== quote.listingId || !Number.isFinite(Number(updated.totalPrice))) {
        throw new Error('Không thể cập nhật giá chuyến đi. Vui lòng thử lại.');
      }
      setQuote({ ...updated, adults: draft.adults, children: draft.children });
      setAccepted(false);
      useFilterStore.getState().setDates(draft.checkInDate, draft.checkOutDate);
      useFilterStore.getState().setGuestCounts(draft.adults, draft.children);
      setError('');
      setEditor(null);
    } catch (failure) {
      throw new Error(paymentErrorMessage(failure));
    } finally {
      setCheckingQuote(false);
    }
  };

  const applyCouponCode = async () => {
    if (!couponInput.trim() || checkingCoupon || busy || bookingCreated) return;
    setCheckingCoupon(true);
    setCouponMessage(null);
    try {
      const code = couponInput.trim().toUpperCase();
      const response = await apiClient.post('/bookings/quote', {
        listingId: quote.listingId,
        checkInDate: quote.checkInDate,
        checkOutDate: quote.checkOutDate,
        guests: quote.guests,
        couponCode: code,
      });
      const updated = response.data.data as BookingQuote;
      if (!response.data.success || !Number.isFinite(Number(updated.totalPrice))) {
        throw new Error('Không thể áp dụng mã khuyến mãi. Vui lòng thử lại.');
      }
      setQuote({ ...updated, adults: quote.adults, children: quote.children });
      setAppliedCoupon(code);
      setCouponMessage({
        text: `Áp dụng mã ${code} thành công! Giảm ${money(updated.discountAmount || 0)}.`,
        isError: false,
      });
    } catch (err) {
      setCouponMessage({ text: paymentErrorMessage(err), isError: true });
    } finally {
      setCheckingCoupon(false);
    }
  };

  const removeCouponCode = async () => {
    if (checkingCoupon || busy || bookingCreated) return;
    setCheckingCoupon(true);
    setCouponMessage(null);
    try {
      const response = await apiClient.post('/bookings/quote', {
        listingId: quote.listingId,
        checkInDate: quote.checkInDate,
        checkOutDate: quote.checkOutDate,
        guests: quote.guests,
      });
      const updated = response.data.data as BookingQuote;
      setQuote({ ...updated, adults: quote.adults, children: quote.children });
      setAppliedCoupon('');
      setCouponInput('');
      setCouponMessage({ text: 'Đã hủy áp dụng mã khuyến mãi.', isError: false });
    } catch (err) {
      setCouponMessage({ text: paymentErrorMessage(err), isError: true });
    } finally {
      setCheckingCoupon(false);
    }
  };

  const bookNow = async () => {
    if (pending.current || busy || editor) return;
    if (!user) {
      requestLogin(navigation, { name: 'ListingDetail', params: { listingId: quote.listingId, openBooking: true, trip } });
      return;
    }
    if (!createdBooking.current) {
      if (
        contact.fullName.trim().length < 2 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) ||
        (contact.phone.trim() && !/^[+()0-9 .-]{7,30}$/.test(contact.phone.trim()))
      ) {
        setError('Vui lòng kiểm tra họ tên, email và số điện thoại liên hệ.');
        return;
      }
      if (!accepted || !quote.policy) {
        setError('Vui lòng đọc và xác nhận chính sách trước khi đặt.');
        return;
      }
    }
    pending.current = true;
    setSubmitting(true);
    setError('');
    try {
      if (!createdBooking.current) {
        const payload = {
          listingId: quote.listingId,
          checkInDate: quote.checkInDate,
          checkOutDate: quote.checkOutDate,
          guests: quote.guests,
          paymentPlan,
          couponCode: appliedCoupon || undefined,
          specialRequests: specialRequests.trim(),
          expectedTotalCents: Math.round(Number(quote.totalPrice) * 100),
          checkout: {
            contact: {
              fullName: contact.fullName.trim(),
              email: contact.email.trim(),
              ...(contact.phone.trim() ? { phone: contact.phone.trim() } : {}),
            },
            policyVersion: quote.policy!.version,
            accepted: true,
          },
        };
        const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify([user.id, payload]));
        const keyName = `traveling_booking_request_${hash}`;
        let requestId = await storage.getItem(keyName);
        if (!requestId) {
          requestId = Crypto.randomUUID();
          await storage.setItem(keyName, requestId);
        }
        const response = await apiClient.post('/bookings', { ...payload, requestId });
        const booking = response.data.data?.booking;
        if (!response.data.success || !booking?.id || !booking?.booking_code) {
          throw new Error('Không thể tạo đơn đặt chỗ. Vui lòng thử lại.');
        }
        createdBooking.current = { id: booking.id, booking_code: booking.booking_code };
        setBookingCreated(true);
        await storage.removeItem(keyName).catch(() => {});
      }
      void queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
      navigation.replace('Payment', { bookingId: createdBooking.current.id });
    } catch (failure: any) {
      if (['PRICE_CHANGED', 'POLICY_CHANGED'].includes(failure?.response?.data?.error?.code)) {
        try {
          const response = await apiClient.post('/bookings/quote', {
            listingId: quote.listingId,
            checkInDate: quote.checkInDate,
            checkOutDate: quote.checkOutDate,
            guests: quote.guests,
            couponCode: appliedCoupon || undefined,
          });
          setQuote({ ...response.data.data, adults: quote.adults, children: quote.children });
          setAccepted(false);
        } catch {
          /* Keep existing quote; never submit it automatically. */
        }
      }
      setError(paymentErrorMessage(failure));
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={uiStyle(styles.screen)}>
      <View style={uiStyle(styles.header)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uiText("Back from confirm and pay")}
          disabled={busy}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('ListingDetail', { listingId: quote.listingId }))}
          style={uiStyle(styles.backButton)}
        >
          <ChevronLeft size={25} color={uiColor("#90979F")} />
        </Pressable>
        <Text accessibilityRole="header" style={uiTextStyle(styles.headerTitle)}>{uiText("Xác nhận đặt phòng")}</Text>
        <View style={uiStyle(styles.backButton)} />
      </View>
      <KeyboardAvoidingView style={uiStyle({ flex: 1 })} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={uiStyle(styles.content)} showsVerticalScrollIndicator={false}>
          <View style={uiStyle(styles.stayCard)}>
            <View style={uiStyle(styles.stayCopy)}>
              <Text style={uiTextStyle(styles.nightlyPrice)}>
                {uiText(money(quote.pricePerNight))}
                <Text style={uiTextStyle(styles.perNight)}>{uiText("/đêm")}</Text>
              </Text>
              <Text style={uiTextStyle(styles.stayTitle)} numberOfLines={2}>{uiText(quote.title)}</Text>
              <View style={uiStyle(styles.ratingRow)}>
                <Star size={13} fill={uiColor("#EBCB55")} color={uiColor("#EBCB55")} />
                <Text style={uiTextStyle(styles.rating)}>
                  {uiText(rating)} <Text style={uiTextStyle(styles.reviewCount)}>{uiText("(")}{uiText(listing?.review_count ?? 0)}{uiText(")")}</Text>
                </Text>
              </View>
            </View>
            {photo ? (
              <Image source={{ uri: photo }} resizeMode="cover" style={uiStyle(styles.stayImage)} accessibilityLabel={uiText(quote.title)} />
            ) : (
              <View style={uiStyle([styles.stayImage, styles.imagePlaceholder])}><Home size={30} color={uiColor("#9CA3AF")} /></View>
            )}
          </View>

          <MediaNotice context={quote.photoContext || listing?.photo_context} />
          <View style={uiStyle(styles.tripSection)}>
            <Text style={uiTextStyle(styles.sectionTitle)}>{uiText("Chuyến đi của bạn")}</Text>
            <View style={uiStyle(styles.tripRow)}>
              <View style={uiStyle(styles.rowCopy)}>
                <Text style={uiTextStyle(styles.tripLabel)}>{uiText("Ngày lưu trú")}</Text>
                <Text style={uiTextStyle(styles.tripValue)}>{uiText(formatTripDates(quote.checkInDate, quote.checkOutDate))}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Edit trip dates")}
                disabled={busy || bookingCreated}
                onPress={() => setEditor('dates')}
                style={uiStyle(styles.editButton)}
              >
                <Edit3 size={20} color={uiColor("#424B53")} />
              </Pressable>
            </View>
            <View style={uiStyle(styles.tripRow)}>
              <View style={uiStyle(styles.rowCopy)}>
                <Text style={uiTextStyle(styles.tripLabel)}>{uiText("Số khách")}</Text>
                <Text style={uiTextStyle(styles.tripValue)}>{uiText(quote.guests)}{uiText(" khách")}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Edit trip guests")}
                disabled={busy || bookingCreated}
                onPress={() => setEditor('guests')}
                style={uiStyle(styles.editButton)}
              >
                <Edit3 size={20} color={uiColor("#424B53")} />
              </Pressable>
            </View>
          </View>

          <View style={uiStyle(styles.paymentSection)}>
            <Text style={uiTextStyle(styles.sectionTitle)}>{uiText("Hình thức thanh toán")}</Text>
            <View accessibilityRole="radiogroup">
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={uiText("Pay in full")}
                aria-checked={paymentPlan === 'full'}
                accessibilityState={{ checked: paymentPlan === 'full', disabled: busy || bookingCreated }}
                disabled={busy || bookingCreated}
                onPress={() => setPaymentPlan('full')}
                style={uiStyle(styles.paymentOption)}
              >
                <View style={uiStyle(styles.optionCopy)}>
                  <Text style={uiTextStyle(styles.optionTitle)}>{uiText("Thanh toán toàn bộ")}</Text>
                  <Text style={uiTextStyle(styles.optionDescription)}>{uiText("Thanh toán ")}{uiText(money(quote.totalPrice))}{uiText(" để server xác nhận đặt phòng.")}</Text>
                </View>
                <View style={uiStyle([styles.radio, paymentPlan === 'full' && styles.checkedRadio])}>
                  {paymentPlan === 'full' && <View style={uiStyle(styles.radioDot)} />}
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={uiText("Pay a part now")}
                aria-checked={paymentPlan === 'deposit'}
                accessibilityState={{ checked: paymentPlan === 'deposit', disabled: busy || bookingCreated }}
                disabled={busy || bookingCreated}
                onPress={() => setPaymentPlan('deposit')}
                style={uiStyle(styles.paymentOption)}
              >
                <View style={uiStyle(styles.optionCopy)}>
                  <Text style={uiTextStyle(styles.optionTitle)}>{uiText("Trả cọc trước")}</Text>
                  <Text style={uiTextStyle(styles.optionDescription)}>{uiText("Trả trước ")}{uiText(money(partial.dueNow))}{uiText(". Phần còn lại cần thanh toán trước khi hoàn tất chuyến đi.")}</Text>
                </View>
                <View style={uiStyle([styles.radio, paymentPlan === 'deposit' && styles.checkedRadio])}>
                  {paymentPlan === 'deposit' && <View style={uiStyle(styles.radioDot)} />}
                </View>
              </Pressable>
            </View>
          </View>

          <View style={uiStyle(styles.contextCard)}>
            <Text style={uiTextStyle(styles.sectionTitle)}>{uiText("Thông tin liên hệ")}</Text>
            <Text style={uiTextStyle(styles.contextHelp)}>{uiText("Thông tin này được lưu cho đơn đặt phòng, không tự thay đổi hồ sơ tài khoản.")}</Text>
            {([
              { key: 'fullName', label: 'Họ và tên', placeholder: 'Tên người liên hệ' },
              { key: 'email', label: 'Email liên hệ', placeholder: 'email@example.com' },
              { key: 'phone', label: 'Số điện thoại (không bắt buộc)', placeholder: '+84 ...' },
            ] as const).map((field) => (
              <View key={field.key} style={uiStyle({ gap: 6 })}>
                <Text style={uiTextStyle(styles.fieldLabel)}>{uiText(field.label)}</Text>
                <TextInput
                  accessibilityLabel={uiText(field.label)}
                  value={contact[field.key]}
                  onChangeText={(value) => setContact((current) => ({ ...current, [field.key]: value }))}
                  editable={!busy && !bookingCreated}
                  placeholder={uiText(field.placeholder)}
                  keyboardType={field.key === 'email' ? 'email-address' : field.key === 'phone' ? 'phone-pad' : 'default'}
                  autoCapitalize={field.key === 'fullName' ? 'words' : 'none'}
                  maxLength={field.key === 'fullName' ? 100 : field.key === 'email' ? 255 : 30}
                  style={uiStyle(styles.input)}
                />
              </View>
            ))}
            <Text style={uiTextStyle(styles.fieldLabel)}>{uiText("Yêu cầu đặc biệt (không bắt buộc)")}</Text>
            <TextInput
              accessibilityLabel={uiText("Yêu cầu đặc biệt")}
              placeholder={uiText("Ví dụ: dự kiến đến muộn. Yêu cầu cần được cơ sở xác nhận.")}
              multiline
              maxLength={500}
              value={specialRequests}
              onChangeText={setSpecialRequests}
              editable={!busy && !bookingCreated}
              style={uiStyle([styles.input, { minHeight: 84, textAlignVertical: 'top' }])}
            />
          </View>

          {/* Ô nhập mã khuyến mãi / Coupon */}
          <View style={uiStyle(styles.contextCard)}>
            <View style={uiStyle({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' })}>
              <View style={uiStyle({ flexDirection: 'row', alignItems: 'center', gap: 6 })}>
                <Tag size={16} color={uiColor("#00B8CE")} />
                <Text style={uiTextStyle(styles.sectionTitle)}>{uiText("Mã khuyến mãi / Coupon")}</Text>
              </View>
              {appliedCoupon ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={uiText("Hủy áp dụng mã khuyến mãi")}
                  disabled={busy || bookingCreated || checkingCoupon}
                  onPress={removeCouponCode}
                >
                  <Text style={uiTextStyle(styles.removeCouponText)}>{uiText("Hủy áp dụng")}</Text>
                </Pressable>
              ) : null}
            </View>

            {appliedCoupon ? (
              <View style={uiStyle(styles.appliedRow)}>
                <View style={uiStyle(styles.appliedTag)}>
                  <Text style={uiTextStyle(styles.appliedTagText)}>{uiText(appliedCoupon)}</Text>
                </View>
                <Text style={uiTextStyle(styles.appliedNotice)}>{uiText("Đã giảm ")}{uiText(money(quote.discountAmount || 0))}{uiText(" vào tổng tiền")}</Text>
              </View>
            ) : (
              <View style={uiStyle(styles.couponInputRow)}>
                <TextInput
                  accessibilityLabel={uiText("Nhập mã khuyến mãi")}
                  placeholder={uiText("Nhập mã (ví dụ: SALE2026)")}
                  placeholderTextColor={uiColor("#9CA3AF")}
                  value={couponInput}
                  onChangeText={(val) => {
                    setCouponInput(val.toUpperCase());
                    if (couponMessage) setCouponMessage(null);
                  }}
                  autoCapitalize="characters"
                  maxLength={40}
                  editable={!busy && !bookingCreated && !checkingCoupon}
                  style={uiStyle([styles.input, { flex: 1, textTransform: 'uppercase' }])}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={uiText("Áp dụng mã khuyến mãi")}
                  disabled={!couponInput.trim() || busy || bookingCreated || checkingCoupon}
                  onPress={applyCouponCode}
                  style={uiStyle([
                    styles.applyCouponBtn,
                    (!couponInput.trim() || busy || bookingCreated || checkingCoupon) && styles.disabledApplyBtn,
                  ])}
                >
                  {checkingCoupon ? (
                    <ActivityIndicator size="small" color={uiColor("#FFFFFF")} />
                  ) : (
                    <Text style={uiTextStyle(styles.applyCouponBtnText)}>{uiText("Áp dụng")}</Text>
                  )}
                </Pressable>
              </View>
            )}

            {couponMessage ? (
              <Text
                accessibilityRole={couponMessage.isError ? 'alert' : 'none'}
                style={uiTextStyle([styles.couponFeedback, couponMessage.isError ? styles.couponError : styles.couponSuccess])}
              >
                {uiText(couponMessage.text)}
              </Text>
            ) : null}
          </View>

          <View style={uiStyle(styles.contextCard)}>
            <Text style={uiTextStyle(styles.sectionTitle)}>{uiText("Điều kiện đặt phòng")}</Text>
            {quote.policy ? (
              <>
                <Text style={uiTextStyle(styles.contextHelp)}>{uiText(quote.policy.cancellation)}</Text>
                <Text style={uiTextStyle(styles.contextHelp)}>{uiText(quote.policy.payment)}</Text>
                <Text style={uiTextStyle(styles.contextHelp)}>{uiText(quote.policy.hold)}</Text>
                <Text style={uiTextStyle(styles.contextHelp)}>{uiText("Thời gian xét điều kiện: ")}{uiText(quote.policy.timezone)}{uiText(". Đây là điều kiện hiện hành của phiên bản ")}{uiText(quote.policy.version)}{uiText(".")}</Text>
              </>
            ) : (
              <Text style={uiTextStyle(styles.error)}>{uiText("Chưa tải được chính sách từ server. Hãy quay lại phòng và lấy báo giá mới.")}</Text>
            )}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: accepted, disabled: busy || bookingCreated }}
              onPress={() => setAccepted((value) => !value)}
              disabled={busy || bookingCreated}
              style={uiStyle(styles.agree)}
            >
              <View style={uiStyle([styles.checkbox, accepted && { backgroundColor: theme.colors.primary }])}>
                <Text style={uiTextStyle({ color: 'white' })}>{accepted ? uiText('✓') : uiText('')}</Text>
              </View>
              <Text style={uiTextStyle([styles.fieldLabel, { flex: 1 }])}>{uiText("Tôi đã đọc và đồng ý với điều kiện đặt phòng, thanh toán và hủy ở trên.")}</Text>
            </Pressable>
          </View>

          <View style={uiStyle(styles.priceSection)}>
            <Text style={uiTextStyle(styles.sectionTitle)}>{uiText("Chi tiết giá")}</Text>
            <View style={uiStyle(styles.priceRows)}>
              <View style={uiStyle(styles.priceRow)}>
                <Text style={uiTextStyle(styles.priceLabel)}>{uiText(money(quote.pricePerNight))}{uiText(" x ")}{uiText(quote.totalNights)}{uiText(" đêm")}</Text>
                <Text style={uiTextStyle(styles.priceValue)}>{uiText(money(quote.basePriceTotal))}</Text>
              </View>
              <View style={uiStyle(styles.priceRow)}>
                <Text style={uiTextStyle(styles.priceLabel)}>{uiText("Phí vệ sinh")}</Text>
                <Text style={uiTextStyle(styles.priceValue)}>{uiText(money(quote.cleaningFee))}</Text>
              </View>
              <View style={uiStyle(styles.priceRow)}>
                <Text style={uiTextStyle(styles.priceLabel)}>{uiText("Phí dịch vụ Traveling")}</Text>
                <Text style={uiTextStyle(styles.priceValue)}>{uiText(money(quote.serviceFee))}</Text>
              </View>
              {Number(quote.discountAmount || 0) > 0 && (
                <View style={uiStyle(styles.priceRow)}>
                  <Text style={uiTextStyle([styles.priceLabel, { color: '#00838F', fontWeight: '600' }])}>{uiText("Giảm giá (")}{uiText(appliedCoupon || 'Mã ưu đãi')}{uiText(")")}</Text>
                  <Text style={uiTextStyle(styles.discount)}>{uiText("-")}{uiText(money(quote.discountAmount!))}</Text>
                </View>
              )}
              {Number(quote.taxAmount || 0) > 0 && (
                <View style={uiStyle(styles.priceRow)}>
                  <Text style={uiTextStyle(styles.priceLabel)}>{uiText("Thuế")}</Text>
                  <Text style={uiTextStyle(styles.priceValue)}>{uiText(money(quote.taxAmount!))}</Text>
                </View>
              )}
            </View>
            <View style={uiStyle(styles.totalRow)}>
              <Text style={uiTextStyle(styles.totalLabel)}>{uiText("Tổng cộng (")}{uiText(quote.currency || 'USD')}{uiText(")")}</Text>
              <Text style={uiTextStyle(styles.totalValue)}>{uiText(money(quote.totalPrice))}</Text>
            </View>
            {paymentPlan === 'deposit' && (
              <View style={uiStyle(styles.depositSummary)}>
                <View style={uiStyle(styles.priceRow)}>
                  <Text style={uiTextStyle(styles.priceLabel)}>{uiText("Thanh toán hôm nay")}</Text>
                  <Text style={uiTextStyle(styles.totalValue)}>{uiText(money(partial.dueNow))}</Text>
                </View>
                <View style={uiStyle(styles.priceRow)}>
                  <Text style={uiTextStyle(styles.priceLabel)}>{uiText("Số tiền còn lại")}</Text>
                  <Text style={uiTextStyle(styles.priceValue)}>{uiText(money(partial.remaining))}</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={uiStyle(styles.footer)}>
        {!!error && <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>{uiText(error)}</Text>}
        {bookingCreated && <Text style={uiTextStyle(styles.holdNote)}>{uiText("Đơn đã được tạo. Tiếp tục thanh toán cho đơn hiện tại, không cần đặt lại.")}</Text>}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uiText("Đặt phòng ngay")}
          disabled={busy || (!bookingCreated && !accepted)}
          onPress={bookNow}
          style={uiStyle([styles.bookButton, (busy || (!bookingCreated && !accepted)) && styles.disabled])}
        >
          {submitting && <ActivityIndicator size="small" color={uiColor("#FFFFFF")} />}
          <Text style={uiTextStyle(styles.bookLabel)}>
            {submitting ? uiText('Đang tạo đặt phòng...') : bookingCreated ? uiText('Tiếp tục thanh toán') : uiText('Đặt phòng')}
          </Text>
        </Pressable>
      </View>
      <TripEditor mode={editor} trip={trip} maxGuests={quote.maxGuests} onClose={() => setEditor(null)} onApply={updateTrip} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contextCard: { marginTop: 20, padding: 16, borderRadius: theme.radius.card, backgroundColor: theme.colors.background, gap: 12 },
  contextHelp: { fontSize: 13, lineHeight: 21, color: theme.colors.muted },
  fieldLabel: { fontSize: 13, lineHeight: 20, color: theme.colors.ink, fontWeight: '500' },
  input: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.field, padding: 12, backgroundColor: 'white', fontSize: 15, color: theme.colors.ink },
  agree: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  checkbox: { width: 24, height: 24, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 62, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#3D454C', fontSize: 15, fontWeight: '600' },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22 },
  stayCard: { flexDirection: 'row', gap: 16, padding: 8, borderWidth: 1, borderColor: '#EFF0F2', borderRadius: 5 },
  stayCopy: { flex: 1, justifyContent: 'center', paddingVertical: 3 },
  nightlyPrice: { fontSize: 22, fontWeight: '700', color: '#262B2F' },
  perNight: { fontSize: 14, fontWeight: '400', color: '#777D83' },
  stayTitle: { fontSize: 13, lineHeight: 19, color: '#555C63', marginTop: 12, marginBottom: 8 },
  stayImage: { width: 88, height: 88, borderRadius: 3, backgroundColor: '#F1F3F4' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { fontSize: 12, color: '#7F858B' },
  reviewCount: { color: '#9CA1A7' },
  tripSection: { paddingTop: 26, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  sectionTitle: { fontSize: 16, lineHeight: 24, fontWeight: '700', color: '#262B2F' },
  tripRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  rowCopy: { flex: 1 },
  tripLabel: { fontSize: 14, lineHeight: 20, color: '#42494F' },
  tripValue: { fontSize: 13, lineHeight: 20, color: '#7A8188' },
  editButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  paymentSection: { paddingTop: 26, paddingBottom: 26, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 7, minHeight: 48 },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: '#565E66' },
  optionDescription: { fontSize: 13, lineHeight: 21, color: '#979DA5', marginTop: 5 },
  radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: '#939BA3', alignItems: 'center', justifyContent: 'center', marginRight: 3 },
  checkedRadio: { borderColor: '#00B8CE' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#00B8CE' },
  priceSection: { paddingTop: 24, paddingBottom: 12 },
  priceRows: { marginTop: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 28 },
  priceLabel: { flexShrink: 1, fontSize: 13, lineHeight: 21, color: '#7A8188' },
  priceValue: { fontSize: 13, lineHeight: 21, color: '#3D454C', fontWeight: '500' },
  discount: { fontSize: 13, lineHeight: 21, color: '#00838F', fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F1F3', marginTop: 10, paddingTop: 12 },
  totalLabel: { fontSize: 14, lineHeight: 22, color: '#7A8188' },
  totalValue: { fontSize: 14, lineHeight: 22, fontWeight: '600', color: '#30363B' },
  depositSummary: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  footer: { width: '100%', maxWidth: 620, alignSelf: 'center', borderTopWidth: 1, borderTopColor: '#F0F1F3', padding: 16 },
  bookButton: { minHeight: 46, borderRadius: 7, backgroundColor: '#00B8CE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bookLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' },
  disabled: { opacity: 0.55 },
  error: { fontSize: 12, lineHeight: 19, color: '#C53D3D', marginBottom: 12 },
  holdNote: { fontSize: 12, lineHeight: 19, color: '#7A8188', marginBottom: 10 },
  appliedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  appliedTag: { backgroundColor: '#ECFCFE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#00BCD4' },
  appliedTagText: { color: '#00838F', fontWeight: '700', fontSize: 13 },
  appliedNotice: { flex: 1, color: '#00838F', fontSize: 13 },
  removeCouponText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  couponInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  applyCouponBtn: { minHeight: 48, paddingHorizontal: 18, backgroundColor: '#00BCD4', borderRadius: theme.radius.field, alignItems: 'center', justifyContent: 'center' },
  disabledApplyBtn: { opacity: 0.5 },
  applyCouponBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  couponFeedback: { fontSize: 12, marginTop: 4 },
  couponError: { color: '#EF4444' },
  couponSuccess: { color: '#10B981' },
});
