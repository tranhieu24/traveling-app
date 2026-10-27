import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
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
    } catch (e) {
      setIsFavorite(!newStatus); // Revert on failure
    } finally {
      setLoadingFav(false);
    }
  };

  const coverUrl =
    listing.cover_photo ||
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80';

  const price = typeof listing.price_per_night === 'number'
    ? listing.price_per_night
    : parseFloat(listing.price_per_night || '0');

  const rating = typeof listing.rating_avg === 'number'
    ? listing.rating_avg.toFixed(2)
    : parseFloat(listing.rating_avg || '0').toFixed(2);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="mb-6 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
    >
      {/* Cover Image */}
      <View className="relative w-full h-64 bg-gray-200">
        <Image
          source={{ uri: coverUrl }}
          className="w-full h-full"
          resizeMode="cover"
        />

        {/* Favorite Heart Button */}
        <TouchableOpacity
          onPress={handleFavoritePress}
          disabled={loadingFav}
          activeOpacity={0.7}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/25 items-center justify-center backdrop-blur-md"
        >
          <Heart
            size={18}
            color={isFavorite ? '#FF5A5F' : '#FFFFFF'}
            fill={isFavorite ? '#FF5A5F' : 'none'}
            strokeWidth={2}
          />
        </TouchableOpacity>

        {/* Category Pill Tag */}
        {listing.category_name && (
          <View className="absolute bottom-3 left-3 bg-white/90 px-2.5 py-1 rounded-full shadow-sm">
            <Text className="text-xs font-semibold text-dark">
              {listing.category_name}
            </Text>
          </View>
        )}
      </View>

      {/* Content Details */}
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-sm font-semibold text-dark flex-1 mr-2" numberOfLines={1}>
            {listing.city}, {listing.country}
          </Text>

          <View className="flex-row items-center">
            <Star size={14} color="#F59E0B" fill="#F59E0B" />
            <Text className="text-xs font-semibold text-dark ml-1">
              {rating} ({listing.review_count || 0})
            </Text>
          </View>
        </View>

        <Text className="text-xs text-dark-muted mb-2" numberOfLines={1}>
          {listing.title}
        </Text>

        <View className="flex-row items-baseline">
          <Text className="text-base font-bold text-dark">
            ${price.toFixed(0)}
          </Text>
          <Text className="text-xs text-dark-muted ml-1">
            / night
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
