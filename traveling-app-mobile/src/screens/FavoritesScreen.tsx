import React from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
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

  const renderEmptyState = () => (
    <View className="bg-gray-50 flex-1 justify-center items-center px-6">
      <Heart size={64} color="#FF5A5F" fill="#FF5A5F" />
      <Text className="text-2xl font-bold text-gray-800 mt-4 mb-2 text-center">
        Wishlists
      </Text>
      <Text className="text-sm text-gray-500 text-center max-w-xs leading-5">
        Save places you love so you can easily find them later.
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('MainTabs')}
        activeOpacity={0.85}
        className="bg-[#00BCD4] py-3 px-8 rounded-xl shadow-sm mt-6"
      >
        <Text className="text-white font-semibold text-base text-center">
          Explore places
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {isLoading ? (
        <View className="flex-1 p-4 bg-white">
          <SkeletonListingList count={2} />
        </View>
      ) : !user || favorites.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <View className="px-5 py-4 border-b border-gray-100 bg-white">
            <Text className="text-2xl font-bold text-gray-900">
              Wishlists
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {favorites.length} saved places
            </Text>
          </View>
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
        </>
      )}
    </SafeAreaView>
  );
};
