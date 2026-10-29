import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Share,
} from 'react-native';
import axios from 'axios';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Heart,
  Share2,
  Star,
  Users,
  Bed,
  Bath,
  Home,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react-native';
import { RootStackParamList, Listing } from '../types';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useFilterStore } from '../store/useFilterStore';
import { Button } from '../components/common/Button';
import { ListingShareDialog } from '../components/common/ListingShareDialog';
import { getListingShareContent } from '../utils/listingShare';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ListingDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ListingDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { listingId } = route.params;
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const detailQueryKey = ['listing_detail', listingId, user?.id];
  const savingFavorite = useRef(false);
  const sharing = useRef(false);
  const { checkInDate, checkOutDate, guests } = useFilterStore();

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [favoriteFeedback, setFavoriteFeedback] = useState('');
  const [notice, setNotice] = useState<{ title: string; message: string; login?: boolean } | null>(null);

  // 1. Fetch Listing Detail
  const { data: listing, isLoading } = useQuery<Listing>({
    queryKey: detailQueryKey,
    queryFn: async () => {
      const res = await apiClient.get(`/listings/${listingId}`);
      return res.data.data;
    },
  });

  const handleFavorite = async () => {
    if (!listing || savingFavorite.current) return;
    if (!user) {
      setNotice({ title: 'Save your favorite places', message: 'Please log in to save this place to your favorites.', login: true });
      return;
    }

    savingFavorite.current = true;
    setIsSavingFavorite(true);
    setFavoriteFeedback('');
    const previousListing = queryClient.getQueryData<Listing>(detailQueryKey) || listing;
    try {
      await queryClient.cancelQueries({ queryKey: detailQueryKey, exact: true });
      queryClient.setQueryData<Listing>(detailQueryKey, { ...previousListing, is_favorite: !previousListing.is_favorite });
      const response = await apiClient.post('/favorites/toggle', { listingId });
      const isFavorite = response.data.data?.isFavorite;
      if (!response.data.success || typeof isFavorite !== 'boolean') {
        throw new Error('Could not update your favorites. Please try again.');
      }
      queryClient.setQueryData<Listing>(detailQueryKey, (current: Listing | undefined) => current ? { ...current, is_favorite: isFavorite } : current);
      setFavoriteFeedback(isFavorite ? 'Saved to favorites.' : 'Removed from favorites.');
      void queryClient.invalidateQueries({ queryKey: ['my_favorites'] });
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
      void queryClient.invalidateQueries({ queryKey: ['search_results'] });
    } catch (error: unknown) {
      queryClient.setQueryData(detailQueryKey, previousListing);
      setNotice({
        title: 'Could not update favorites',
        message: axios.isAxiosError(error)
          ? error.response?.data?.error?.message || 'Please check your connection and try again.'
          : error instanceof Error ? error.message : 'Please try again.',
        login: axios.isAxiosError(error) && error.response?.status === 401,
      });
    } finally {
      savingFavorite.current = false;
      setIsSavingFavorite(false);
    }
  };

  const handleShare = async () => {
    if (!listing || sharing.current) return;
    if (Platform.OS === 'web') {
      setShareVisible(true);
      return;
    }
    sharing.current = true;
    setIsSharing(true);
    try {
      const content = getListingShareContent(listing);
      await Share.share(Platform.OS === 'android'
        ? { title: content.title, message: `${content.message}\n${content.url}` }
        : content);
    } catch (error: unknown) {
      if (!(error instanceof Error && error.name === 'AbortError')) setShareVisible(true);
    } finally {
      sharing.current = false;
      setIsSharing(false);
    }
  };

  const handleReserve = async () => {
    if (authLoading || isQuoting) return;
    if (!user) {
      setNotice({ title: 'Login required', message: 'Please sign in to make a reservation.', login: true });
      return;
    }

    // Xác định ngày đặt: dùng ngày từ store hoặc mặc định 3 ngày sau
    let inDate = checkInDate;
    let outDate = checkOutDate;
    if (!inDate || !outDate) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() + 5);
      const end = new Date(start);
      end.setDate(start.getDate() + 3);

      inDate = start.toISOString().split('T')[0];
      outDate = end.toISOString().split('T')[0];
    }

    setIsQuoting(true);
    try {
      const quoteRes = await apiClient.post('/bookings/quote', {
        listingId,
        checkInDate: inDate,
        checkOutDate: outDate,
        guests: Math.min(guests || 1, listing?.max_guests || 2),
      });

      if (quoteRes.data.success) {
        navigation.navigate('OrderReview', { quote: quoteRes.data.data });
      }
    } catch (error: any) {
      setNotice({ title: 'Reservation error', message: error.response?.data?.error?.message || 'Unable to quote pricing for these dates.' });
    } finally {
      setIsQuoting(false);
    }
  };

  if (isLoading || !listing) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#00BCD4" />
      </View>
    );
  }

  const photos = listing.photos && listing.photos.length > 0
    ? listing.photos
    : [{ id: '1', photo_url: listing.cover_photo || '', display_order: 1, is_cover: true, listing_id: listing.id }];

  const price = typeof listing.price_per_night === 'number'
    ? listing.price_per_night
    : parseFloat(listing.price_per_night || '0');

  const rating = typeof listing.rating_avg === 'number'
    ? listing.rating_avg.toFixed(2)
    : parseFloat(listing.rating_avg || '0').toFixed(2);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Photo Gallery Carousel */}
        <View className="relative w-full h-80 bg-gray-900">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const offset = e.nativeEvent.contentOffset.x;
              const idx = Math.round(offset / SCREEN_WIDTH);
              setActivePhotoIndex(idx);
            }}
            scrollEventThrottle={16}
          >
            {photos.map((item) => (
              <Image
                key={item.id}
                source={{ uri: item.photo_url }}
                style={{ width: SCREEN_WIDTH, height: 320 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Top Floating Buttons */}
          <View className="absolute top-4 left-4 right-4 flex-row justify-between items-center">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('MainTabs')}
              className="w-10 h-10 rounded-full bg-white/80 items-center justify-center backdrop-blur-md"
            >
              <ChevronLeft size={24} color="#222222" />
            </TouchableOpacity>

            <View className="flex-row space-x-2">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Share this place"
                accessibilityState={{ disabled: isSharing, busy: isSharing }}
                onPress={handleShare}
                disabled={isSharing}
                className="w-10 h-10 rounded-full bg-white/80 items-center justify-center backdrop-blur-md"
              >
                {isSharing ? <ActivityIndicator size="small" color="#00BCD4" /> : <Share2 size={18} color="#222222" />}
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={listing.is_favorite ? 'Remove from favorites' : 'Save to favorites'}
                accessibilityState={{ selected: !!listing.is_favorite, disabled: isSavingFavorite, busy: isSavingFavorite }}
                onPress={handleFavorite}
                disabled={isSavingFavorite}
                className="w-10 h-10 rounded-full bg-white/80 items-center justify-center backdrop-blur-md"
              >
                {isSavingFavorite ? <ActivityIndicator size="small" color="#00BCD4" /> : (
                  <Heart size={18} color={listing.is_favorite ? '#FF5A5F' : '#222222'} fill={listing.is_favorite ? '#FF5A5F' : 'none'} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Counter Pill */}
          <View className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-full">
            <Text className="text-xs text-white font-medium">
              {activePhotoIndex + 1} / {photos.length}
            </Text>
          </View>
        </View>

        {/* Content Body */}
        <View className="p-5">
          {!!favoriteFeedback && (
            <View className="mb-3 rounded-lg bg-primary-50 p-3">
              <Text accessibilityRole="alert" className="text-xs font-medium text-primary-800">{favoriteFeedback}</Text>
            </View>
          )}
          {/* Title and Location */}
          <Text className="text-2xl font-extrabold text-dark mb-2">
            {listing.title}
          </Text>
          <Text className="text-sm font-semibold text-dark-muted mb-4">
            {listing.address ? `${listing.address}, ` : ''}{listing.city}, {listing.country}
          </Text>

          {/* Key Stats Bar */}
          <View className="flex-row items-center space-x-4 pb-5 border-b border-gray-100">
            <View className="flex-row items-center">
              <Users size={16} color="#717171" />
              <Text className="text-xs font-medium text-dark ml-1.5">{listing.max_guests} guests</Text>
            </View>
            <View className="flex-row items-center">
              <Home size={16} color="#717171" />
              <Text className="text-xs font-medium text-dark ml-1.5">{listing.bedrooms} bedrooms</Text>
            </View>
            <View className="flex-row items-center">
              <Bed size={16} color="#717171" />
              <Text className="text-xs font-medium text-dark ml-1.5">{listing.beds} beds</Text>
            </View>
            <View className="flex-row items-center">
              <Bath size={16} color="#717171" />
              <Text className="text-xs font-medium text-dark ml-1.5">{listing.bathrooms} baths</Text>
            </View>
          </View>

          {/* Rating Summary */}
          <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Star size={20} color="#F59E0B" fill="#F59E0B" />
              <Text className="text-base font-bold text-dark ml-2">
                {rating}
              </Text>
              <Text className="text-xs text-dark-muted ml-1">
                ({listing.review_count || 0} reviews)
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('AllReviews', {
                listingId: listing.id,
                ratingAvg: parseFloat(rating),
                reviewCount: listing.review_count,
              })}
            >
              <Text className="text-xs font-bold text-primary underline">See reviews</Text>
            </TouchableOpacity>
          </View>

          {/* Host Card */}
          <View className="flex-row items-center py-5 border-b border-gray-100">
            <Image
              source={{
                uri: listing.host_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
              }}
              className="w-12 h-12 rounded-full mr-3.5 bg-gray-200"
            />
            <View className="flex-1">
              <Text className="text-sm font-bold text-dark">
                Hosted by {listing.host_name || 'Superhost'}
              </Text>
              <Text className="text-xs text-dark-muted">
                Experienced host with top-rated hospitality
              </Text>
            </View>
          </View>

          {/* Description */}
          <View className="py-5 border-b border-gray-100">
            <Text className="text-base font-bold text-dark mb-2">About this space</Text>
            <Text className="text-sm text-dark leading-6">
              {listing.description || 'Welcome to this cozy place.'}
            </Text>
          </View>

          {/* Amenities Grid */}
          <View className="py-5 border-b border-gray-100">
            <Text className="text-base font-bold text-dark mb-4">What this place offers</Text>
            <View className="flex-row flex-wrap justify-between">
              {listing.amenities && listing.amenities.map((item) => (
                <View key={item.id} className="w-[48%] flex-row items-center mb-3">
                  <CheckCircle2 size={16} color="#00BCD4" />
                  <Text className="text-xs text-dark ml-2 font-medium" numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Review actions */}
          <View className="py-5 flex-row space-x-3">
            <Button
              title="Write a Review"
              variant="outline"
              size="md"
              className="flex-1"
              icon={<MessageSquare size={16} color="#222222" />}
              onPress={() => navigation.navigate('WriteReview', {
                listingId: listing.id,
                listingTitle: listing.title,
              })}
            />
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View className="p-4 border-t border-gray-200 bg-white flex-row items-center justify-between">
        <View>
          <View className="flex-row items-baseline">
            <Text className="text-xl font-extrabold text-dark">${price.toFixed(0)}</Text>
            <Text className="text-xs text-dark-muted ml-1">/ night</Text>
          </View>
          <Text className="text-[11px] text-dark-muted underline">
            {checkInDate && checkOutDate ? `${checkInDate} - ${checkOutDate}` : 'Select dates on booking'}
          </Text>
        </View>

        <Button
          title="Reserve"
          onPress={handleReserve}
          loading={isQuoting || authLoading}
            disabled={authLoading}
          variant="primary"
          size="lg"
          className="px-8"
        />
      </View>
      <ListingShareDialog listing={listing} visible={shareVisible} onClose={() => setShareVisible(false)} />
      <Modal visible={!!notice} transparent animationType="fade" onRequestClose={() => setNotice(null)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-6">
          <View accessibilityViewIsModal className="w-full max-w-sm rounded-2xl bg-white p-6">
            <Text accessibilityRole="header" className="text-lg font-bold text-dark mb-3">{notice?.title}</Text>
            <Text className="text-sm text-dark-muted leading-6 mb-4">{notice?.message}</Text>
            {notice?.login && (
              <Button title="Log in" onPress={() => {
                setNotice(null);
                navigation.navigate('Login');
              }} className="mb-3" />
            )}
            <Button title="Close" variant="outline" onPress={() => setNotice(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
