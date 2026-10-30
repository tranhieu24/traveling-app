import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { Bed, Heart, ImageOff, Star } from 'lucide-react-native';
import { Listing, RootStackParamList } from '../../types';
import { apiClient } from '../../services/apiClient';
import { formatPaymentMoney } from '../../utils/paymentSummary';
import { useAuth } from '../../context/AuthContext';

interface ListingCardProps {
  listing: Listing;
  showTotalPrice?: boolean;
  showBedroomCount?: boolean;
  onPress: () => void;
  onFavoriteToggle?: (isFav: boolean) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onPress, onFavoriteToggle, showTotalPrice = false, showBedroomCount = false }) => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const savingFavorite = useRef(false);
  const [isFavorite, setIsFavorite] = useState(!!listing.is_favorite);
  const [loadingFav, setLoadingFav] = useState(false);
  const [imageWidth, setImageWidth] = useState(0);
  const [activePhoto, setActivePhoto] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);
  const gallery = useRef<ScrollView>(null);

  useEffect(() => {
    setIsFavorite(!!listing.is_favorite);
  }, [listing.id, listing.is_favorite]);

  useEffect(() => {
    setActivePhoto(0);
    setFailedPhotos([]);
    gallery.current?.scrollTo({ x: 0, animated: false });
  }, [listing.id, listing.cover_photo]);

  const photoUrls = [...new Set([
    listing.cover_photo,
    ...(listing.photos || []).map((photo) => photo.photo_url),
  ].filter((url): url is string => !!url))];
  const price = showTotalPrice ? (listing.pricing ? Number(listing.pricing.tripTotal) : NaN) : Number(listing.price_per_night);
  const rating = Number(listing.rating_avg);

  const handleFavoritePress = async () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    if (savingFavorite.current) return;
    savingFavorite.current = true;
    setLoadingFav(true);
    const previousStatus = isFavorite;
    setIsFavorite(!previousStatus);
    try {
      const response = await apiClient.post('/favorites/toggle', { listingId: listing.id });
      const nextStatus = response.data.data.isFavorite as boolean;
      setIsFavorite(nextStatus);
      onFavoriteToggle?.(nextStatus);
      void queryClient.invalidateQueries({ queryKey: ['my_favorites'] });
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
      void queryClient.invalidateQueries({ queryKey: ['search_results'] });
      void queryClient.invalidateQueries({ queryKey: ['listing_detail', listing.id] });
    } catch {
      setIsFavorite(previousStatus);
      Alert.alert('Could not update favorites', 'Please check your connection and try again.');
    } finally {
      savingFavorite.current = false;
      setLoadingFav(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer} onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        setImageWidth(width);
        gallery.current?.scrollTo({ x: activePhoto * width, animated: false });
      }}>
        {photoUrls.length > 0 ? (
          <ScrollView
            ref={gallery}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={photoUrls.length > 1}
            onMomentumScrollEnd={(event) => {
              if (imageWidth > 0) setActivePhoto(Math.round(event.nativeEvent.contentOffset.x / imageWidth));
            }}
            style={styles.gallery}
          >
            {photoUrls.map((url, index) => (
              <Pressable key={url} accessibilityRole="button" accessibilityLabel={`View ${listing.title}, photo ${index + 1}`} onPress={onPress} style={[styles.photo, { width: imageWidth }]}>
                {failedPhotos.includes(url) ? <ImageOff size={30} color="#9AA1A9" /> : (
                  <Image
                    source={{ uri: url }}
                    accessibilityLabel={listing.title}
                    resizeMode="cover"
                    style={styles.image}
                    onError={() => setFailedPhotos((current) => current.includes(url) ? current : [...current, url])}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${listing.title}`} onPress={onPress} style={styles.placeholder}>
            <ImageOff size={30} color="#9AA1A9" />
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? `Remove ${listing.title} from favorites` : `Save ${listing.title} to favorites`}
          accessibilityState={{ selected: isFavorite, disabled: loadingFav, busy: loadingFav }}
          onPress={handleFavoritePress}
          disabled={loadingFav}
          hitSlop={6}
          style={({ pressed }) => [styles.heartButton, pressed && styles.pressed]}
        >
          {loadingFav ? <ActivityIndicator size="small" color="#00BCD4" /> : (
            <Heart size={21} color={isFavorite ? '#F05C70' : '#939BA4'} fill={isFavorite ? '#F05C70' : 'transparent'} strokeWidth={1.8} />
          )}
        </Pressable>

        {photoUrls.length > 1 && (
          <View style={styles.pagination}>
            {photoUrls.map((url, index) => (
              <Pressable
                key={url}
                accessibilityRole="button"
                accessibilityLabel={`Photo ${index + 1} of ${photoUrls.length}`}
                accessibilityState={{ selected: activePhoto === index }}
                onPress={() => {
                  setActivePhoto(index);
                  gallery.current?.scrollTo({ x: index * imageWidth, animated: true });
                }}
                style={styles.dotTarget}
              >
                <View style={[styles.dot, activePhoto === index && styles.activeDot]} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={`View ${listing.title}`} onPress={onPress} style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
          <View style={styles.ratingRow}>
            <Star size={12} color="#EBC64D" fill="#EBC64D" strokeWidth={1} />
            <Text style={styles.ratingText}>{Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : 'New'}</Text>
          </View>
        </View>
        <View style={styles.secondRow}>
          {showBedroomCount ? <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}><Bed size={14} color="#93979F" /><Text style={styles.category}>{listing.bedrooms} {listing.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</Text></View> : <Text style={styles.category} numberOfLines={1}>{listing.category_name || listing.property_type}</Text>}
          <Text style={styles.price}><Text style={styles.priceAmount}>{Number.isFinite(price) ? formatPaymentMoney(price, listing.currency || 'USD') : '--'}</Text>{showTotalPrice ? ' total' : '/night'}</Text>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 26, backgroundColor: '#FFFFFF' },
  imageContainer: { width: '100%', aspectRatio: 1.08, borderRadius: 7, overflow: 'hidden', backgroundColor: '#F0F2F3' },
  gallery: { flex: 1 },
  photo: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heartButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  pagination: { position: 'absolute', bottom: 4, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  dotTarget: { width: 12, height: 24, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  activeDot: { backgroundColor: '#FFFFFF', width: 6, height: 6 },
  content: { paddingTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#30343A' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, lineHeight: 20, color: '#93979F' },
  secondRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  category: { flex: 1, fontSize: 13, lineHeight: 20, color: '#93979F' },
  price: { fontSize: 13, lineHeight: 20, color: '#797C81' },
  priceAmount: { fontSize: 14, color: '#30343A', fontWeight: '700' },
});
