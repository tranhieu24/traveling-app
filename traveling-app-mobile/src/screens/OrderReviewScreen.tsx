import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Edit3, Home, Star } from 'lucide-react-native';
import { BookingQuote, Listing, RootStackParamList } from '../types';
import { apiClient } from '../services/apiClient';
import { paymentErrorMessage } from '../services/bookingPayment';
import { useAuth } from '../context/AuthContext';
import { useFilterStore } from '../store/useFilterStore';
import { TripDraft, TripEditor } from '../components/booking/TripEditor';
import { formatPaymentMoney } from '../utils/paymentSummary';
import { formatTripDates, paymentSplit } from '../utils/checkout';

export const OrderReviewScreen: React.FC = () => {
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
  const pending = useRef(false);
  const createdBooking = useRef<{ id: string; booking_code: string } | null>(null);
  const { data: listing } = useQuery<Listing>({
    queryKey: ['listing_detail', quote.listingId, user?.id],
    queryFn: async () => (await apiClient.get(`/listings/${encodeURIComponent(quote.listingId)}`)).data.data,
    staleTime: 60000,
  });
  const money = (value: number | string) => formatPaymentMoney(value, quote.currency || 'USD');
  const partial = paymentSplit(quote.totalPrice, 'deposit');
  const trip: TripDraft = { checkInDate: quote.checkInDate, checkOutDate: quote.checkOutDate, adults: quote.adults ?? Math.max(1, quote.guests - (quote.children || 0)), children: quote.children || 0 };
  const busy = submitting || checkingQuote || authLoading;
  const photo = quote.coverPhoto || listing?.cover_photo || listing?.photos?.[0]?.photo_url;
  const rating = listing && Number.isFinite(Number(listing.rating_avg)) ? Number(listing.rating_avg).toFixed(1) : '--';

  const updateTrip = async (draft: TripDraft) => {
    if (createdBooking.current) throw new Error('This booking has already been created. Open its reservation details to continue.');
    setCheckingQuote(true);
    try {
      const response = await apiClient.post('/bookings/quote', { listingId: quote.listingId, checkInDate: draft.checkInDate, checkOutDate: draft.checkOutDate, guests: draft.adults + draft.children });
      const updated = response.data.data as BookingQuote;
      if (!response.data.success || updated?.listingId !== quote.listingId || !Number.isFinite(Number(updated.totalPrice))) throw new Error('Could not update the trip price. Please try again.');
      setQuote({ ...updated, adults: draft.adults, children: draft.children });
      useFilterStore.getState().setDates(draft.checkInDate, draft.checkOutDate);
      useFilterStore.getState().setGuestCounts(draft.adults, draft.children);
      setError('');
      setEditor(null);
    } catch (failure) { throw new Error(paymentErrorMessage(failure)); }
    finally { setCheckingQuote(false); }
  };

  const bookNow = async () => {
    if (pending.current || busy || editor) return;
    if (!user) { navigation.navigate('Login'); return; }
    pending.current = true;
    setSubmitting(true);
    setError('');
    try {
      if (!createdBooking.current) {
        const response = await apiClient.post('/bookings', { listingId: quote.listingId, checkInDate: quote.checkInDate, checkOutDate: quote.checkOutDate, guests: quote.guests, paymentPlan });
        const booking = response.data.data?.booking;
        if (!response.data.success || !booking?.id || !booking?.booking_code) throw new Error('Could not create your reservation. Please try again.');
        createdBooking.current = { id: booking.id, booking_code: booking.booking_code };
        setBookingCreated(true);
      }
      void queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
      navigation.replace('Payment', { bookingId: createdBooking.current.id });
    } catch (failure) { setError(paymentErrorMessage(failure)); }
    finally { pending.current = false; setSubmitting(false); }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back from confirm and pay" disabled={busy} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('ListingDetail', { listingId: quote.listingId })} style={styles.backButton}><ChevronLeft size={25} color="#90979F" /></Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Confirm and pay</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stayCard}>
          <View style={styles.stayCopy}>
            <Text style={styles.nightlyPrice}>{money(quote.pricePerNight)}<Text style={styles.perNight}>/night</Text></Text>
            <Text style={styles.stayTitle} numberOfLines={2}>{quote.title}</Text>
            <View style={styles.ratingRow}><Star size={13} fill="#EBCB55" color="#EBCB55" /><Text style={styles.rating}>{rating} <Text style={styles.reviewCount}>({listing?.review_count ?? 0})</Text></Text></View>
          </View>
          {photo ? <Image source={{ uri: photo }} resizeMode="cover" style={styles.stayImage} accessibilityLabel={quote.title} /> : <View style={[styles.stayImage, styles.imagePlaceholder]}><Home size={30} color="#9CA3AF" /></View>}
        </View>

        <View style={styles.tripSection}>
          <Text style={styles.sectionTitle}>Your trip</Text>
          <View style={styles.tripRow}>
            <View style={styles.rowCopy}><Text style={styles.tripLabel}>Dates</Text><Text style={styles.tripValue}>{formatTripDates(quote.checkInDate, quote.checkOutDate)}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit trip dates" disabled={busy || bookingCreated} onPress={() => setEditor('dates')} style={styles.editButton}><Edit3 size={20} color="#424B53" /></Pressable>
          </View>
          <View style={styles.tripRow}>
            <View style={styles.rowCopy}><Text style={styles.tripLabel}>Guests</Text><Text style={styles.tripValue}>{quote.guests} {quote.guests === 1 ? 'guest' : 'guests'}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit trip guests" disabled={busy || bookingCreated} onPress={() => setEditor('guests')} style={styles.editButton}><Edit3 size={20} color="#424B53" /></Pressable>
          </View>
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment options</Text>
          <View accessibilityRole="radiogroup">
            <Pressable accessibilityRole="radio" accessibilityLabel="Pay in full" aria-checked={paymentPlan === 'full'} accessibilityState={{ checked: paymentPlan === 'full', disabled: busy || bookingCreated }} disabled={busy || bookingCreated} onPress={() => setPaymentPlan('full')} style={styles.paymentOption}>
              <View style={styles.optionCopy}><Text style={styles.optionTitle}>Pay in full</Text><Text style={styles.optionDescription}>Pay {money(quote.totalPrice)} now to finalize your booking.</Text></View>
              <View style={[styles.radio, paymentPlan === 'full' && styles.checkedRadio]}>{paymentPlan === 'full' && <View style={styles.radioDot} />}</View>
            </Pressable>
            <Pressable accessibilityRole="radio" accessibilityLabel="Pay a part now" aria-checked={paymentPlan === 'deposit'} accessibilityState={{ checked: paymentPlan === 'deposit', disabled: busy || bookingCreated }} disabled={busy || bookingCreated} onPress={() => setPaymentPlan('deposit')} style={styles.paymentOption}>
              <View style={styles.optionCopy}><Text style={styles.optionTitle}>Pay a part now</Text><Text style={styles.optionDescription}>Pay {money(partial.dueNow)} now. Any remaining amount can be paid at a later time.</Text></View>
              <View style={[styles.radio, paymentPlan === 'deposit' && styles.checkedRadio]}>{paymentPlan === 'deposit' && <View style={styles.radioDot} />}</View>
            </Pressable>
          </View>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.sectionTitle}>Price details</Text>
          <View style={styles.priceRows}>
            <View style={styles.priceRow}><Text style={styles.priceLabel}>{money(quote.pricePerNight)} x {quote.totalNights} {quote.totalNights === 1 ? 'night' : 'nights'}</Text><Text style={styles.priceValue}>{money(quote.basePriceTotal)}</Text></View>
            <View style={styles.priceRow}><Text style={styles.priceLabel}>Cleaning fee</Text><Text style={styles.priceValue}>{money(quote.cleaningFee)}</Text></View>
            <View style={styles.priceRow}><Text style={styles.priceLabel}>Traveling service fee</Text><Text style={styles.priceValue}>{money(quote.serviceFee)}</Text></View>
            {Number(quote.discountAmount || 0) > 0 && <View style={styles.priceRow}><Text style={styles.priceLabel}>Discount</Text><Text style={styles.discount}>-{money(quote.discountAmount!)}</Text></View>}
            {Number(quote.taxAmount || 0) > 0 && <View style={styles.priceRow}><Text style={styles.priceLabel}>Taxes</Text><Text style={styles.priceValue}>{money(quote.taxAmount!)}</Text></View>}
          </View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Total ({quote.currency || 'USD'})</Text><Text style={styles.totalValue}>{money(quote.totalPrice)}</Text></View>
          {paymentPlan === 'deposit' && <View style={styles.depositSummary}><View style={styles.priceRow}><Text style={styles.priceLabel}>Due today</Text><Text style={styles.totalValue}>{money(partial.dueNow)}</Text></View><View style={styles.priceRow}><Text style={styles.priceLabel}>Remaining balance</Text><Text style={styles.priceValue}>{money(partial.remaining)}</Text></View></View>}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {bookingCreated && <Text style={styles.holdNote}>Your reservation has been created. Continue to payment for this booking.</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Book now" disabled={busy} onPress={bookNow} style={[styles.bookButton, busy && styles.disabled]}>{submitting && <ActivityIndicator size="small" color="#FFFFFF" />}<Text style={styles.bookLabel}>{submitting ? 'Creating reservation...' : bookingCreated ? 'Continue to payment' : 'Book now'}</Text></Pressable>
      </View>
      <TripEditor mode={editor} trip={trip} maxGuests={quote.maxGuests} onClose={() => setEditor(null)} onApply={updateTrip} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 62, width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#3D454C', fontSize: 15, fontWeight: '600' },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22 },
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
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#262B2F' },
  tripRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  rowCopy: { flex: 1 },
  tripLabel: { fontSize: 14, lineHeight: 20, color: '#42494F' },
  tripValue: { fontSize: 13, lineHeight: 20, color: '#7A8188' },
  editButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  paymentSection: { paddingTop: 34, paddingBottom: 34, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 7, minHeight: 48 },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: '#565E66' },
  optionDescription: { fontSize: 13, lineHeight: 21, color: '#979DA5', marginTop: 5 },
  radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: '#939BA3', alignItems: 'center', justifyContent: 'center', marginRight: 3 },
  checkedRadio: { borderColor: '#00B8CE' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#00B8CE' },
  priceSection: { paddingTop: 34, paddingBottom: 12 },
  priceRows: { marginTop: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 28 },
  priceLabel: { flexShrink: 1, fontSize: 13, lineHeight: 21, color: '#7A8188' },
  priceValue: { fontSize: 13, lineHeight: 21, color: '#3D454C', fontWeight: '500' },
  discount: { fontSize: 13, lineHeight: 21, color: '#15803D', fontWeight: '500' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F1F3', marginTop: 10, paddingTop: 12 },
  totalLabel: { fontSize: 14, lineHeight: 22, color: '#7A8188' },
  totalValue: { fontSize: 14, lineHeight: 22, fontWeight: '600', color: '#30363B' },
  depositSummary: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  footer: { width: '100%', maxWidth: 460, alignSelf: 'center', borderTopWidth: 1, borderTopColor: '#F0F1F3', padding: 16 },
  bookButton: { minHeight: 46, borderRadius: 7, backgroundColor: '#00B8CE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bookLabel: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' },
  disabled: { opacity: 0.55 },
  error: { fontSize: 12, lineHeight: 19, color: '#C53D3D', marginBottom: 12 },
  holdNote: { fontSize: 12, lineHeight: 19, color: '#7A8188', marginBottom: 10 },
});
