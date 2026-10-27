import React from 'react';
import { View, Text, FlatList, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { RootStackParamList, Listing } from '../types';
import { apiClient } from '../services/apiClient';
import { useFilterStore } from '../store/useFilterStore';
import { Header } from '../components/common/Header';
import { ListingCard } from '../components/common/ListingCard';
import { SkeletonListingList } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';

export const SearchResultsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    region,
    selectedCategory,
    checkInDate,
    checkOutDate,
    guests,
    minPrice,
    maxPrice,
    selectedAmenities,
  } = useFilterStore();

  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ['search_results', region, selectedCategory, checkInDate, checkOutDate, guests, minPrice, maxPrice, selectedAmenities],
    queryFn: async () => {
      const params: any = { limit: 20 };
      if (region) params.region = region;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (checkInDate) params.checkIn = checkInDate;
      if (checkOutDate) params.checkOut = checkOutDate;
      if (guests > 1) params.guests = guests;
      if (minPrice !== null) params.minPrice = minPrice;
      if (maxPrice !== null) params.maxPrice = maxPrice;
      if (selectedAmenities.length > 0) params.amenityIds = selectedAmenities;

      const res = await apiClient.get('/listings', { params });
      return res.data.data;
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Search Results" />

      <View className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex-row justify-between items-center">
        <Text className="text-xs font-semibold text-dark">
          {listings.length} stays available
        </Text>
        {region && (
          <Text className="text-xs text-primary font-bold">
            in {region}
          </Text>
        )}
      </View>

      {isLoading ? (
        <SkeletonListingList count={3} />
      ) : listings.length === 0 ? (
        <EmptyState
          title="No stays match your criteria"
          description="Try broadening your search or adjusting dates to find more stays."
          actionTitle="Back to Search"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};
