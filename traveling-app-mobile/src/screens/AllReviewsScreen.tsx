import React from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Star, MessageSquare } from 'lucide-react-native';
import { RootStackParamList, Review } from '../types';
import { apiClient } from '../services/apiClient';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';

export const AllReviewsScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'AllReviews'>>();
  const { listingId, ratingAvg, reviewCount } = route.params;

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ['listing_reviews', listingId],
    queryFn: async () => {
      const res = await apiClient.get(`/listings/${listingId}/reviews`, {
        params: { limit: 50 },
      });
      return res.data.data;
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Guest Reviews" />

      {/* Rating Summary Header */}
      <View className="px-5 py-4 border-b border-gray-100 flex-row items-center">
        <Star size={24} color="#F59E0B" fill="#F59E0B" />
        <Text className="text-xl font-bold text-dark ml-2">
          {ratingAvg.toFixed(2)}
        </Text>
        <Text className="text-sm text-dark-muted ml-2">
          • {reviewCount} total reviews
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#00BCD4" />
        </View>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={48} color="#00BCD4" />}
          title="No reviews yet"
          description="Be the first to leave a review for this wonderful place!"
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View className="mb-6 pb-6 border-b border-gray-100">
              <View className="flex-row items-center mb-3">
                <Image
                  source={{
                    uri:
                      item.user_avatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
                  }}
                  className="w-10 h-10 rounded-full mr-3 bg-gray-200"
                />
                <View>
                  <Text className="text-sm font-bold text-dark">
                    {item.user_name}
                  </Text>
                  <Text className="text-[11px] text-dark-muted">
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View className="ml-auto flex-row items-center">
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text className="text-xs font-bold text-dark ml-1">
                    {item.rating}
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-dark leading-5">
                {item.comment}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};
