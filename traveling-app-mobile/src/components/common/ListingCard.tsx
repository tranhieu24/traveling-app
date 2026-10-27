/**
 * ListingCard — Airbnb-style accommodation card.
 *
 * Shadow uses StyleSheet (cross-platform: elevation on Android,
 * boxShadow-compatible on Web, shadow* on iOS) instead of deprecated
 * inline `shadow*` props that trigger console warnings on web.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Heart, Star } from 'lucide-react-native';
import { Listing } from '../../types';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

interface ListingCardProps {
  listing: Listing;
  onPress: () => void;
  onFavoriteToggle?: (isFav: boolean) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onPress,
  onFavoriteToggle,
}) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(listing.is_favorite || false);
  const [loadingFav, setLoadingFav] = useState(false);

  const handleFavoritePress = async () => {
    if (!user) {
      alert('Please log in to save favorites');
      return;
    }
    setLoadingFav(true);
    const newStatus = !isFavorite;
    setIsFavorite(newStatus);
    try {
      await apiClient.post('/favorites/toggle', { listingId: listing.id });
      if (onFavoriteToggle) onFavoriteToggle(newStatus);
    } catch {
      setIsFavorite(!newStatus); // Revert on failure
    } finally {
      setLoadingFav(false);
    }
  };

  const coverUrl =
    listing.cover_photo ||
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80';

  const price =
    typeof listing.price_per_night === 'number'
      ? listing.price_per_night
      : parseFloat(listing.price_per_night || '0');

  const rating =
    typeof listing.rating_avg === 'number'
      ? listing.rating_avg.toFixed(2)
      : parseFloat(listing.rating_avg || '0').toFixed(2);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.card}
    >
      {/* ── Cover Image ── */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: coverUrl }} style={styles.image} resizeMode="cover" />

        {/* Heart / Favourite button */}
        <TouchableOpacity
          onPress={handleFavoritePress}
          disabled={loadingFav}
          activeOpacity={0.7}
          style={styles.heartButton}
        >
          <Heart
            size={18}
            color={isFavorite ? '#FF5A5F' : '#FFFFFF'}
            fill={isFavorite ? '#FF5A5F' : 'none'}
            strokeWidth={2}
          />
        </TouchableOpacity>

        {/* Category pill */}
        {listing.category_name && (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{listing.category_name}</Text>
          </View>
        )}
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>
        {/* Location row + rating */}
        <View style={styles.row}>
          <Text style={styles.location} numberOfLines={1}>
            {listing.city}, {listing.country}
          </Text>
          <View style={styles.ratingRow}>
            <Star size={14} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>
              {rating} ({listing.review_count || 0})
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>${price.toFixed(0)}</Text>
          <Text style={styles.perNight}> / night</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    // Cross-platform shadow (no deprecated shadow* warnings on web)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        // @ts-ignore — valid CSS on web via react-native-web
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#222222',
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  location: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginRight: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222222',
    marginLeft: 4,
  },
  title: {
    fontSize: 12,
    color: '#717171',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },
  perNight: {
    fontSize: 12,
    color: '#717171',
  },
});
