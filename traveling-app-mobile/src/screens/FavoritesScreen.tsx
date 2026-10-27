import React from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react-native';
import { RootStackParamList, Listing } from '../types';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { ListingCard } from '../components/common/ListingCard';
import { SkeletonListingList } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const {
    data: favorites = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Listing[]>({
    queryKey: ['my_favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await apiClient.get('/favorites');
      return res.data.data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <EmptyState
          icon={<Heart size={48} color="#FF5A5F" />}
          title="Sign in to see your favorites"
          description="Save the places you love so you can easily find them later."
          actionTitle="Sign In"
          onAction={() => navigation.navigate('Login')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 py-4 border-b border-gray-100">
        <Text className="text-2xl font-extrabold text-dark">
          Wishlists
        </Text>
        <Text className="text-xs text-dark-muted mt-0.5">
          {favorites.length} saved places
        </Text>
      </View>

      {isLoading ? (
        <SkeletonListingList count={2} />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={<Heart size={48} color="#FF5A5F" />}
          title="No favorites yet"
          description="As you search, tap the heart icon to save your favorite stays to your wishlist."
          actionTitle="Explore Homes"
          onAction={() => navigation.navigate('MainTabs')}
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#00BCD4"
            />
          }
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
              onFavoriteToggle={() => refetch()}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};
