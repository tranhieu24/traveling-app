import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Heart, MapPin, Share2, Star } from 'lucide-react-native';
import { BookingQuote, RootStackParamList, Listing } from '../types';
import { apiClient } from '../services/apiClient';
import { fetchListingDetail, fetchReviewPage } from '../services/listingDetail';
import { useAuth } from '../context/AuthContext';
import { useFilterStore } from '../store/useFilterStore';
import { ListingShareDialog } from '../components/common/ListingShareDialog';
import { getListingShareContent } from '../utils/listingShare';
import { listingMapUrl, listingPhotos, previewAmenities } from '../utils/listingDetail';
import { formatPaymentMoney } from '../utils/paymentSummary';
import { validateTrip } from '../utils/checkout';
import { searchDateLabel } from '../utils/search';
import {
  ListingHero,
  ListingImage,
  ListingPhotoGallery,
} from '../components/listing/ListingPhotoGallery';
import {
  AmenityIcon,
  CheckinPolicy,
  HouseRules,
  ListingDetailPanels,
  ListingPanel,
  ListingStats,
} from '../components/listing/ListingDetailPanels';
import { ReviewCard } from '../components/listing/ReviewCard';
import { ListingTripModal } from '../components/listing/ListingTripModal';
import { TripDraft } from '../components/booking/TripEditor';

type Notice = { title: string; message: string; login?: boolean; dates?: boolean };
export const ListingDetailScreen: React.FC = () => {
  const {
    params: { listingId },
  } = useRoute<RouteProp<RootStackParamList, 'ListingDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isLoading: authLoading } = useAuth();
  const filters = useFilterStore();
  const queryClient = useQueryClient();
  const detailKey = ['listing_detail', listingId, user?.id];
  const favoritePending = useRef(false),
    sharePending = useRef(false),
    quotePending = useRef(false);
  const [savingFavorite, setSavingFavorite] = useState(false),
    [sharing, setSharing] = useState(false),
    [quoting, setQuoting] = useState(false);
  const [shareVisible, setShareVisible] = useState(false),
    [photosVisible, setPhotosVisible] = useState(false),
    [tripVisible, setTripVisible] = useState(false);
  const [panel, setPanel] = useState<ListingPanel>(null),
    [notice, setNotice] = useState<Notice | null>(null);
  const [favoriteFeedback, setFavoriteFeedback] = useState('');
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: ({ signal }) => fetchListingDetail(listingId, signal),
  });
  const listing = detail.data;
  const reviews = useQuery({
    queryKey: ['listing_reviews', listingId, 'preview'],
    queryFn: ({ signal }) => fetchReviewPage(listingId, 1, 3, signal),
    enabled: !!listing,
  });
  const back = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.replace('MainTabs', { screen: 'SearchTab' });
  const favorite = async () => {
    if (!listing || favoritePending.current || authLoading) return;
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    favoritePending.current = true;
    setSavingFavorite(true);
    setFavoriteFeedback('');
    const previous = queryClient.getQueryData<Listing>(detailKey) || listing;
    try {
      await queryClient.cancelQueries({ queryKey: detailKey, exact: true });
      queryClient.setQueryData(detailKey, { ...previous, is_favorite: !previous.is_favorite });
      const response = await apiClient.post('/favorites/toggle', { listingId });
      const value = response.data.data?.isFavorite;
      if (!response.data.success || typeof value !== 'boolean')
        throw new Error('Could not update favorites. Please try again.');
      queryClient.setQueryData<Listing>(detailKey, (current: Listing | undefined) =>
        current ? { ...current, is_favorite: value } : current
      );
      setFavoriteFeedback(value ? 'Saved to favorites.' : 'Removed from favorites.');
      void Promise.all(
        ['my_favorites', 'listings', 'search_results'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] })
        )
      );
    } catch (error) {
      queryClient.setQueryData(detailKey, previous);
      setNotice({
        title: 'Could not update favorites',
        message: errorMessage(error),
        login: axios.isAxiosError(error) && error.response?.status === 401,
      });
    } finally {
      favoritePending.current = false;
      setSavingFavorite(false);
    }
  };
  const share = async () => {
    if (!listing || sharePending.current) return;
    if (Platform.OS === 'web') {
      setShareVisible(true);
      return;
    }
    sharePending.current = true;
    setSharing(true);
    try {
      const content = getListingShareContent(listing);
      await Share.share(
        Platform.OS === 'android'
          ? { title: content.title, message: `${content.message}\n${content.url}` }
          : content
      );
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setShareVisible(true);
    } finally {
      sharePending.current = false;
      setSharing(false);
    }
  };
  const trip: TripDraft = {
    checkInDate: filters.checkInDate || '',
    checkOutDate: filters.checkOutDate || '',
    adults: filters.adults || 1,
    children: filters.children,
  };
  const quoteTrip = async (draft: TripDraft) => {
    if (!listing || quotePending.current) return;
    if (!user) {
      setTripVisible(false);
      navigation.navigate('Login');
      return;
    }
    validateTrip(
      draft.checkInDate,
      draft.checkOutDate,
      draft.adults,
      draft.children,
      listing.max_guests
    );
    quotePending.current = true;
    setQuoting(true);
    try {
      const response = await apiClient.post('/bookings/quote', {
        listingId,
        checkInDate: draft.checkInDate,
        checkOutDate: draft.checkOutDate,
        guests: draft.adults + draft.children,
      });
      const quote = response.data.data as BookingQuote;
      if (
        !response.data.success ||
        quote?.listingId !== listingId ||
        !Number.isFinite(Number(quote.totalPrice)) ||
        quote.checkInDate !== draft.checkInDate ||
        quote.checkOutDate !== draft.checkOutDate ||
        quote.guests !== draft.adults + draft.children
      )
        throw new Error('Could not confirm this trip price. Please try again.');
      filters.setDates(draft.checkInDate, draft.checkOutDate);
      filters.setGuestCounts(draft.adults, draft.children);
      setTripVisible(false);
      setPhotosVisible(false);
      setPanel(null);
      setShareVisible(false);
      setNotice(null);
      navigation.navigate('OrderReview', {
        quote: { ...quote, adults: draft.adults, children: draft.children },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setTripVisible(false);
        navigation.navigate('Login');
        return;
      }
      throw new Error(errorMessage(error));
    } finally {
      quotePending.current = false;
      setQuoting(false);
    }
  };
  const bookNow = async () => {
    if (!listing || authLoading || quotePending.current) return;
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    try {
      validateTrip(
        trip.checkInDate,
        trip.checkOutDate,
        trip.adults,
        trip.children,
        listing.max_guests
      );
    } catch {
      setTripVisible(true);
      return;
    }
    try {
      await quoteTrip(trip);
    } catch (error) {
      setNotice({ title: 'Check your trip', message: errorMessage(error), dates: true });
    }
  };
  const openTrip = () => {
    if (authLoading || quotePending.current) return;
    if (!user) navigation.navigate('Login');
    else setTripVisible(true);
  };
  const openMap = async () => {
    if (!listing) return;
    const url = listingMapUrl(listing);
    if (!url) {
      setNotice({
        title: 'Location unavailable',
        message: 'No location has been provided for this stay.',
      });
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setNotice({
        title: 'Could not open map',
        message: 'Please check your connection and try again.',
      });
    }
  };
  const openReviews = () => {
    if (listing)
      navigation.navigate('AllReviews', {
        listingId,
        listingTitle: listing.title,
        ratingAvg: Number(listing.rating_avg),
        reviewCount: reviews.data?.total ?? listing.review_count,
      });
  };

  if (detail.isLoading || !listing)
    return (
      <SafeAreaView edges={['top', 'bottom']} style={s.screen}>
        <View style={s.frame}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to stays"
            onPress={back}
            style={s.backFallback}
          >
            <ChevronLeft size={25} color="#8993A0" />
          </Pressable>
          <View style={s.fallback}>
            {detail.isLoading ? (
              <ActivityIndicator color="#00B8CE" />
            ) : (
              <>
                <Text style={s.emptyTitle}>Unable to load this stay</Text>
                <Text style={s.muted}>
                  It may be unavailable, or your connection was interrupted.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry room details"
                  onPress={() => void detail.refetch()}
                  style={s.book}
                >
                  <Text style={s.bookLabel}>Try again</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  const photos = listingPhotos(listing),
    descriptionPhoto = photos[1] || photos[0];
  const count = reviews.data?.total ?? listing.review_count;
  const rating = Number(listing.rating_avg);
  const ratingLabel = count > 0 && Number.isFinite(rating) ? rating.toFixed(1) : 'New';
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={s.screen}>
      <View style={s.frame}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 18 }}
        >
          <ListingHero
            key={listing.id}
            photos={photos}
            onPhotos={() => setPhotosVisible(true)}
            controls={
              <View style={s.photoActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  onPress={back}
                  style={s.circle}
                >
                  <ChevronLeft size={24} color="#727C89" />
                </Pressable>
                <View style={s.photoRight}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Share this place"
                    disabled={sharing}
                    onPress={() => void share()}
                    style={s.circle}
                  >
                    {sharing ? (
                      <ActivityIndicator color="#00B8CE" />
                    ) : (
                      <Share2 size={18} color="#727C89" />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      listing.is_favorite ? 'Remove from favorites' : 'Save to favorites'
                    }
                    aria-pressed={!!listing.is_favorite}
                    accessibilityState={{
                      selected: !!listing.is_favorite,
                      disabled: savingFavorite || authLoading,
                    }}
                    disabled={savingFavorite || authLoading}
                    onPress={() => void favorite()}
                    style={s.circle}
                  >
                    {savingFavorite ? (
                      <ActivityIndicator color="#00B8CE" />
                    ) : (
                      <Heart
                        size={19}
                        color={listing.is_favorite ? '#EC7180' : '#727C89'}
                        fill={listing.is_favorite ? '#EC7180' : 'transparent'}
                      />
                    )}
                  </Pressable>
                </View>
              </View>
            }
          />
          <View style={s.intro}>
            <Text style={s.title}>{listing.title}</Text>
            <View style={s.location}>
              <MapPin size={15} color="#00B8CE" />
              <Text style={s.locationText}>
                {listing.city}, {listing.country}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View room map"
                onPress={() => void openMap()}
              >
                <Text style={s.mapLink}>View map</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Read all guest reviews"
              onPress={openReviews}
              style={s.ratingStrip}
            >
              <Star size={13} color="#EAC44C" fill="#EAC44C" />
              <Text style={s.ratingSmall}>
                {ratingLabel}
                {count ? '/5' : ''}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={s.reviewCount}>
                {count} {count === 1 ? 'review' : 'reviews'}
              </Text>
              <ChevronRight size={17} color="#A2AAB5" />
            </Pressable>
            {!!favoriteFeedback && (
              <Text accessibilityLiveRegion="polite" style={s.feedback}>
                {favoriteFeedback}
              </Text>
            )}
            {detail.isError && (
              <Pressable accessibilityRole="button" onPress={() => detail.refetch()}>
                <Text style={s.muted}>Could not refresh this stay. Tap to try again.</Text>
              </Pressable>
            )}
          </View>
          <View style={s.section}>
            <Text style={s.heading}>Facilities & services</Text>
            <ListingStats listing={listing} />
            {previewAmenities(listing.amenities || []).map((amenity) => (
              <View key={amenity.id} style={s.amenity}>
                <AmenityIcon amenity={amenity} />
                <Text style={s.amenityName}>{amenity.name}</Text>
              </View>
            ))}
            {!listing.amenities?.length && (
              <Text style={s.muted}>No facilities have been listed for this stay.</Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show all facilities and services"
              onPress={() => setPanel('facilities')}
              style={s.outline}
            >
              <Text style={s.outlineLabel}>Show all</Text>
            </Pressable>
          </View>
          <View style={s.section}>
            <View style={s.headingRow}>
              <Text style={s.heading}>Reviews</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="See all reviews"
                onPress={openReviews}
                style={s.seeAll}
              >
                <Text style={s.seeAllText}>See all</Text>
                <ChevronRight size={14} color="#A2AAB5" />
              </Pressable>
            </View>
            <View style={s.reviewScore}>
              <Text style={s.largeRating}>{ratingLabel}</Text>
              {count > 0 && <Text style={s.outOf}>/5</Text>}
            </View>
            {reviews.isLoading ? (
              <ActivityIndicator color="#00B8CE" style={{ paddingVertical: 20 }} />
            ) : reviews.isError ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry room reviews"
                onPress={() => reviews.refetch()}
              >
                <Text style={s.muted}>Unable to load reviews. Tap to retry.</Text>
              </Pressable>
            ) : !reviews.data?.reviews.length ? (
              <Text style={s.muted}>No reviews yet for this stay.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {reviews.data.reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} compact onPress={openReviews} />
                ))}
              </ScrollView>
            )}
          </View>
          <View style={s.section}>
            <Text style={s.heading}>Policies</Text>
            <HouseRules listing={listing} />
            <Text style={s.subheading}>Checkin policies</Text>
            <View style={{ maxHeight: 44, overflow: 'hidden' }}>
              <CheckinPolicy listing={listing} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all room policies"
              onPress={() => setPanel('policies')}
              style={s.outline}
            >
              <Text style={s.outlineLabel}>View more</Text>
              <ChevronRight size={14} color="#A6AEB7" />
            </Pressable>
          </View>
          <View style={s.section}>
            <Text style={s.heading}>Description</Text>
            <View style={s.descriptionPhoto}>
              <ListingImage url={descriptionPhoto} />
            </View>
            <Text style={s.description} numberOfLines={4}>
              {listing.description?.trim() || 'No description has been provided for this stay.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View full room description"
              onPress={() => setPanel('description')}
              style={s.outline}
            >
              <Text style={s.outlineLabel}>View more</Text>
              <ChevronRight size={14} color="#A6AEB7" />
            </Pressable>
          </View>
        </ScrollView>
        <View style={s.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose room dates and guests"
            onPress={openTrip}
            style={s.priceArea}
          >
            <Text style={s.from}>
              From: <Text style={s.price}>{formatPaymentMoney(listing.price_per_night)}</Text>/night
            </Text>
            <Text style={s.tripHint} numberOfLines={1}>
              {trip.checkInDate && trip.checkOutDate
                ? searchDateLabel(trip.checkInDate, trip.checkOutDate)
                : 'Select dates'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book now"
            disabled={authLoading || quoting}
            onPress={() => void bookNow()}
            style={[s.book, (authLoading || quoting) && { opacity: 0.6 }]}
          >
            {quoting && <ActivityIndicator color="white" size="small" />}
            <Text style={s.bookLabel}>{quoting ? 'Checking...' : 'Book now'}</Text>
          </Pressable>
        </View>
        <ListingPhotoGallery
          visible={photosVisible}
          photos={photos}
          onClose={() => setPhotosVisible(false)}
        />
        <ListingDetailPanels
          panel={panel}
          listing={listing}
          descriptionPhoto={descriptionPhoto}
          onClose={() => setPanel(null)}
          onMap={() => void openMap()}
        />
        <ListingTripModal
          visible={tripVisible}
          trip={trip}
          maxGuests={listing.max_guests}
          onClose={() => {
            if (!quotePending.current) setTripVisible(false);
          }}
          onApply={quoteTrip}
        />
        <ListingShareDialog
          listing={listing}
          visible={shareVisible}
          onClose={() => setShareVisible(false)}
        />
        <Modal
          visible={!!notice}
          transparent
          animationType="fade"
          onRequestClose={() => setNotice(null)}
        >
          <View style={s.noticeOverlay}>
            <View accessibilityViewIsModal style={s.noticeCard}>
              <Text accessibilityRole="header" style={s.emptyTitle}>
                {notice?.title}
              </Text>
              <Text style={s.noticeText}>{notice?.message}</Text>
              {notice?.login && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Log in to continue"
                  onPress={() => {
                    setNotice(null);
                    navigation.navigate('Login');
                  }}
                  style={s.book}
                >
                  <Text style={s.bookLabel}>Log in</Text>
                </Pressable>
              )}
              {notice?.dates && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change room trip dates"
                  onPress={() => {
                    setNotice(null);
                    setTripVisible(true);
                  }}
                  style={s.book}
                >
                  <Text style={s.bookLabel}>Change dates</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close room notice"
                onPress={() => setNotice(null)}
                style={s.outline}
              >
                <Text style={s.outlineLabel}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};
const errorMessage = (error: unknown): string =>
  axios.isAxiosError(error)
    ? error.response?.data?.error?.message || 'Please check your connection and try again.'
    : error instanceof Error
      ? error.message
      : 'Please try again.';
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F2F5' },
  frame: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: 'white' },
  photoActions: {
    position: 'absolute',
    top: 15,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRight: { flexDirection: 'row', gap: 8 },
  intro: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#EFF1F4' },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: '#3B424C' },
  location: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  locationText: { flex: 1, fontSize: 12, lineHeight: 20, color: '#8E97A2' },
  mapLink: { color: '#00B0C5', fontSize: 12, textDecorationLine: 'underline' },
  ratingStrip: {
    minHeight: 42,
    padding: 10,
    backgroundColor: '#F8F9FB',
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    marginTop: 14,
  },
  ratingSmall: { fontSize: 12, color: '#969DA7' },
  reviewCount: { color: '#969DA7', fontSize: 12, marginRight: 5 },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF1F4',
  },
  heading: { color: '#4E5662', fontSize: 16, lineHeight: 24, fontWeight: '600', marginBottom: 13 },
  amenity: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 30 },
  amenityName: { fontSize: 13, color: '#929AA5' },
  outline: {
    minHeight: 35,
    borderWidth: 1,
    borderColor: '#B9C0CA',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 16,
  },
  outlineLabel: { color: '#969FAA', fontSize: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 3 },
  seeAllText: { fontSize: 11, color: '#9DA5AF' },
  reviewScore: { flexDirection: 'row', alignItems: 'baseline', marginTop: -2, marginBottom: 15 },
  largeRating: { color: '#626B78', fontSize: 31, lineHeight: 40, fontWeight: '600' },
  outOf: { color: '#9FA7B1', fontSize: 15 },
  subheading: { fontSize: 13, color: '#737D8A', fontWeight: '600', marginBottom: 9 },
  descriptionPhoto: {
    width: '100%',
    aspectRatio: 1.65,
    backgroundColor: '#F1F3F5',
    marginBottom: 13,
  },
  description: { color: '#939BA6', fontSize: 12, lineHeight: 21 },
  footer: {
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBEEF2',
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceArea: { flex: 1 },
  from: { fontSize: 12, color: '#9BA3AE' },
  price: { color: '#4C5663', fontSize: 14, fontWeight: '600' },
  tripHint: { color: '#9EA7B1', fontSize: 10, marginTop: 5 },
  book: {
    minHeight: 44,
    minWidth: 140,
    paddingHorizontal: 22,
    backgroundColor: '#00B8CE',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookLabel: { fontSize: 13, color: 'white', fontWeight: '600' },
  feedback: { color: '#00A0B5', fontSize: 11, marginTop: 10 },
  backFallback: {
    width: 45,
    height: 50,
    margin: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25, gap: 18 },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: '#4A5664',
    fontWeight: '600',
    textAlign: 'center',
  },
  muted: { fontSize: 12, color: '#939CA8', lineHeight: 21, textAlign: 'center' },
  noticeOverlay: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25,34,45,0.36)',
  },
  noticeCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 15,
    backgroundColor: 'white',
    padding: 22,
  },
  noticeText: { color: '#8995A3', fontSize: 13, lineHeight: 22, marginVertical: 18 },
});
