import { uiLocale, useUiPreferences, uiStyle, uiText, uiColor, uiTextStyle } from '../preferences/ui';

import { requestLogin } from '../navigation/authReturn';
import { MediaNotice } from '../components/common/MediaNotice';
import React, { useEffect, useRef, useState } from 'react';
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
import { formatAmenityName, listingMapUrl, listingPhotos, previewAmenities } from '../utils/listingDetail';
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
  useUiPreferences();
  const {
    params: { listingId, openBooking, trip: resumedTrip },
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
  useEffect(() => {
    if (!openBooking || !user || !listing) return;
    navigation.setParams({ openBooking: undefined, trip: undefined });
    if (resumedTrip) {
      try {
        validateTrip(resumedTrip.checkInDate, resumedTrip.checkOutDate, resumedTrip.adults, resumedTrip.children, listing.max_guests);
        filters.setDates(resumedTrip.checkInDate, resumedTrip.checkOutDate);
        filters.setGuestCounts(resumedTrip.adults, resumedTrip.children);
      } catch { /* Invalid or old dates can be corrected in the trip editor. */ }
    }
    setTripVisible(true);
  }, [openBooking, resumedTrip, user?.id, listing?.id, navigation]);

  const favorite = async () => {
    if (!listing || favoritePending.current || authLoading) return;
    if (!user) {
      requestLogin(navigation, { name: 'ListingDetail', params: { listingId } });
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
        throw new Error('Không thể cập nhật mục yêu thích. Vui lòng thử lại.');
      queryClient.setQueryData<Listing>(detailKey, (current: Listing | undefined) =>
        current ? { ...current, is_favorite: value } : current
      );
      setFavoriteFeedback(value ? 'Đã lưu vào mục yêu thích.' : 'Đã xóa khỏi mục yêu thích.');
      void Promise.all(
        ['my_favorites', 'listings', 'search_results'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] })
        )
      );
    } catch (error) {
      queryClient.setQueryData(detailKey, previous);
      setNotice({
        title: 'Không thể cập nhật mục yêu thích',
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
      requestLogin(navigation, { name: 'ListingDetail', params: { listingId, openBooking: true, trip: draft } });
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
        throw new Error('Không thể xác nhận giá chuyến đi. Vui lòng thử lại.');
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
        requestLogin(navigation, { name: 'ListingDetail', params: { listingId, openBooking: true, trip: draft } });
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
      requestLogin(navigation, { name: 'ListingDetail', params: { listingId, openBooking: true, trip: trip } });
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
      setNotice({ title: 'Kiểm tra chuyến đi', message: errorMessage(error), dates: true });
    }
  };
  const openTrip = () => {
    if (authLoading || quotePending.current) return;
    setTripVisible(true);
  };
  const openMap = async () => {
    if (!listing) return;
    const url = listingMapUrl(listing);
    if (!url) {
      setNotice({
        title: 'Không có vị trí',
        message: 'Chỗ ở này chưa cung cấp vị trí.',
      });
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setNotice({
        title: 'Không thể mở bản đồ',
        message: "Vui lòng kiểm tra kết nối rồi thử lại.",
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
      <SafeAreaView edges={['top', 'bottom']} style={uiStyle(s.screen)}>
        <View style={uiStyle(s.frame)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Back to stays")}
            onPress={back}
            style={uiStyle(s.backFallback)}
          >
            <ChevronLeft size={25} color={uiColor("#8993A0")} />
          </Pressable>
          <View style={uiStyle(s.fallback)}>
            {detail.isLoading ? (
              <ActivityIndicator color={uiColor("#00B8CE")} />
            ) : (
              <>
                <Text style={uiTextStyle(s.emptyTitle)}>{uiText("Không thể tải chỗ ở này")}</Text>
                <Text style={uiTextStyle(s.muted)}>{uiText("It may be unavailable, or your connection was interrupted.")}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={uiText("Retry room details")}
                  onPress={() => void detail.refetch()}
                  style={uiStyle(s.book)}
                >
                  <Text style={uiTextStyle(s.bookLabel)}>{uiText("Thử lại")}</Text>
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
  const ratingLabel = count > 0 && Number.isFinite(rating) ? rating.toFixed(1) : 'Mới';
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={uiStyle(s.screen)}>
      <View style={uiStyle(s.frame)}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={uiStyle({ paddingBottom: 18 })}
        >
          <ListingHero
            key={listing.id}
            photos={photos}
            onPhotos={() => setPhotosVisible(true)}
            controls={
              <View style={uiStyle(s.photoActions)}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={uiText("Go back")}
                  onPress={back}
                  style={uiStyle(s.circle)}
                >
                  <ChevronLeft size={24} color={uiColor("#727C89")} />
                </Pressable>
                <View style={uiStyle(s.photoRight)}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={uiText("Share this place")}
                    disabled={sharing}
                    onPress={() => void share()}
                    style={uiStyle(s.circle)}
                  >
                    {sharing ? (
                      <ActivityIndicator color={uiColor("#00B8CE")} />
                    ) : (
                      <Share2 size={18} color={uiColor("#727C89")} />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={listing.is_favorite ? uiText('Xóa khỏi mục yêu thích') : uiText('Lưu vào mục yêu thích')}
                    aria-pressed={!!listing.is_favorite}
                    accessibilityState={{
                      selected: !!listing.is_favorite,
                      disabled: savingFavorite || authLoading,
                    }}
                    disabled={savingFavorite || authLoading}
                    onPress={() => void favorite()}
                    style={uiStyle(s.circle)}
                  >
                    {savingFavorite ? (
                      <ActivityIndicator color={uiColor("#00B8CE")} />
                    ) : (
                      <Heart
                        size={19}
                        color={uiColor(listing.is_favorite ? '#EC7180' : '#727C89')}
                        fill={uiColor(listing.is_favorite ? '#EC7180' : 'transparent')}
                      />
                    )}
                  </Pressable>
                </View>
              </View>
            }
          />
          <View style={uiStyle(s.intro)}>
            <MediaNotice context={listing.photo_context} compact />
            <Text style={uiTextStyle(s.title)}>{listing.title}</Text>
            <View style={uiStyle(s.location)}>
              <MapPin size={15} color={uiColor("#00B8CE")} />
              <Text style={uiTextStyle(s.locationText)}>
                {uiText(listing.city)}{uiText(", ")}{uiText(listing.country)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Xem bản đồ chỗ ở")}
                onPress={() => void openMap()}
              >
                <Text style={uiTextStyle(s.mapLink)}>{uiText("Xem bản đồ")}</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={uiText("Xem tất cả đánh giá của khách")}
              onPress={openReviews}
              style={uiStyle(s.ratingStrip)}
            >
              <Star size={13} color={uiColor("#EAC44C")} fill={uiColor("#EAC44C")} />
              <Text style={uiTextStyle(s.ratingSmall)}>
                {uiText(ratingLabel)}
                {count ? uiText('/5') : uiText('')}
              </Text>
              <View style={uiStyle({ flex: 1 })} />
              <Text style={uiTextStyle(s.reviewCount)}>
                {uiText(count)}{uiText(" đánh giá")}</Text>
              <ChevronRight size={17} color={uiColor("#A2AAB5")} />
            </Pressable>
            {!!favoriteFeedback && (
              <Text accessibilityLiveRegion="polite" style={uiTextStyle(s.feedback)}>
                {uiText(favoriteFeedback)}
              </Text>
            )}
            {detail.isError && (
              <Pressable accessibilityRole="button" onPress={() => detail.refetch()}>
                <Text style={uiTextStyle(s.muted)}>{uiText("Không thể cập nhật chỗ ở. Chạm để thử lại.")}</Text>
              </Pressable>
            )}
          </View>
          <View style={uiStyle(s.section)}>
            <Text style={uiTextStyle(s.heading)}>{uiText("Tiện nghi và dịch vụ")}</Text>
            <ListingStats listing={listing} />
            {previewAmenities(listing.amenities || []).map((amenity) => (
              <View key={amenity.id} style={uiStyle(s.amenity)}>
                <AmenityIcon amenity={amenity} />
                <Text style={uiTextStyle(s.amenityName)}>{uiText(formatAmenityName(amenity.name))}</Text>
              </View>
            ))}
            {!listing.amenities?.length && (
              <Text style={uiTextStyle(s.muted)}>{uiText("Chỗ ở này chưa liệt kê tiện nghi.")}</Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={uiText("Xem tất cả tiện nghi và dịch vụ")}
              onPress={() => setPanel('facilities')}
              style={uiStyle(s.outline)}
            >
              <Text style={uiTextStyle(s.outlineLabel)}>{uiText("Xem tất cả")}</Text>
            </Pressable>
          </View>
          <View style={uiStyle(s.section)}>
            <View style={uiStyle(s.headingRow)}>
              <Text style={uiTextStyle(s.heading)}>{uiText("Đánh giá")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Xem tất cả đánh giá")}
                onPress={openReviews}
                style={uiStyle(s.seeAll)}
              >
                <Text style={uiTextStyle(s.seeAllText)}>{uiText("Xem tất cả")}</Text>
                <ChevronRight size={14} color={uiColor("#A2AAB5")} />
              </Pressable>
            </View>
            <View style={uiStyle(s.reviewScore)}>
              <Text style={uiTextStyle(s.largeRating)}>{uiText(ratingLabel)}</Text>
              {count > 0 && <Text style={uiTextStyle(s.outOf)}>{uiText("/5")}</Text>}
            </View>
            {reviews.isLoading ? (
              <ActivityIndicator color={uiColor("#00B8CE")} style={uiStyle({ paddingVertical: 20 })} />
            ) : reviews.isError ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Retry room reviews")}
                onPress={() => reviews.refetch()}
              >
                <Text style={uiTextStyle(s.muted)}>{uiText("Chưa tải được đánh giá. Chạm để thử lại.")}</Text>
              </Pressable>
            ) : !reviews.data?.reviews.length ? (
              <Text style={uiTextStyle(s.muted)}>{uiText("Chỗ ở này chưa có đánh giá.")}</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={uiStyle({ gap: 12 })}
              >
                {reviews.data.reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} compact onPress={openReviews} />
                ))}
              </ScrollView>
            )}
          </View>
          <View style={uiStyle(s.section)}>
            <Text style={uiTextStyle(s.heading)}>{uiText("Chính sách")}</Text>
            <HouseRules listing={listing} />
            <Text style={uiTextStyle(s.subheading)}>{uiText("Điều kiện nhận phòng")}</Text>
            <View style={uiStyle({ maxHeight: 44, overflow: 'hidden' })}>
              <CheckinPolicy listing={listing} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={uiText("View all room policies")}
              onPress={() => setPanel('policies')}
              style={uiStyle(s.outline)}
            >
              <Text style={uiTextStyle(s.outlineLabel)}>{uiText("Xem thêm")}</Text>
              <ChevronRight size={14} color={uiColor("#A6AEB7")} />
            </Pressable>
          </View>
          <View style={uiStyle(s.section)}>
            <MediaNotice context={listing.photo_context} />
            <Text style={uiTextStyle(s.heading)}>{uiText("Mô tả")}</Text>
            <View style={uiStyle(s.descriptionPhoto)}>
              <ListingImage url={descriptionPhoto} />
            </View>
            <Text style={uiTextStyle(s.description)} numberOfLines={4}>
              {uiText(listing.description?.trim() || "Cơ sở chưa cung cấp mô tả cho chỗ ở này.")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={uiText("View full room description")}
              onPress={() => setPanel('description')}
              style={uiStyle(s.outline)}
            >
              <Text style={uiTextStyle(s.outlineLabel)}>{uiText("Xem thêm")}</Text>
              <ChevronRight size={14} color={uiColor("#A6AEB7")} />
            </Pressable>
          </View>
        </ScrollView>
        <View style={uiStyle(s.footer)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Choose room dates and guests")}
            onPress={openTrip}
            style={uiStyle(s.priceArea)}
          >
            <Text style={uiTextStyle(s.from)}>{uiText("From: ")}<Text style={uiTextStyle(s.price)}>{uiText(formatPaymentMoney(listing.price_per_night, 'USD', uiLocale()))}</Text>{uiText("/night")}</Text>
            <Text style={uiTextStyle(s.tripHint)} numberOfLines={1}>
              {trip.checkInDate && trip.checkOutDate ? uiText(searchDateLabel(trip.checkInDate, trip.checkOutDate, uiLocale())) : uiText('Chọn ngày')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Book now")}
            disabled={authLoading || quoting}
            onPress={() => void bookNow()}
            style={uiStyle([s.book, (authLoading || quoting) && { opacity: 0.6 }])}
          >
            {quoting && <ActivityIndicator color={uiColor("white")} size="small" />}
            <Text style={uiTextStyle(s.bookLabel)}>{quoting ? uiText('Checking...') : uiText("Đặt phòng")}</Text>
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
          <View style={uiStyle(s.noticeOverlay)}>
            <View accessibilityViewIsModal style={uiStyle(s.noticeCard)}>
              <Text accessibilityRole="header" style={uiTextStyle(s.emptyTitle)}>
                {uiText(notice?.title)}
              </Text>
              <Text style={uiTextStyle(s.noticeText)}>{uiText(notice?.message)}</Text>
              {notice?.login && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={uiText("Log in to continue")}
                  onPress={() => {
                    setNotice(null);
                    requestLogin(navigation, { name: 'ListingDetail', params: { listingId } });
                  }}
                  style={uiStyle(s.book)}
                >
                  <Text style={uiTextStyle(s.bookLabel)}>{uiText("Đăng nhập")}</Text>
                </Pressable>
              )}
              {notice?.dates && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={uiText("Change room trip dates")}
                  onPress={() => {
                    setNotice(null);
                    setTripVisible(true);
                  }}
                  style={uiStyle(s.book)}
                >
                  <Text style={uiTextStyle(s.bookLabel)}>{uiText("Đổi ngày")}</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Close room notice")}
                onPress={() => setNotice(null)}
                style={uiStyle(s.outline)}
              >
                <Text style={uiTextStyle(s.outlineLabel)}>{uiText("Đóng")}</Text>
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
    ? error.response?.data?.error?.message || "Vui lòng kiểm tra kết nối rồi thử lại."
    : error instanceof Error
      ? error.message
      : 'Vui lòng thử lại.';
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
