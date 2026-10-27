import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react-native';
import { RootStackParamList, Category, Listing } from '../types';
import { apiClient } from '../services/apiClient';
import { useFilterStore } from '../store/useFilterStore';
import { CategoryBar } from '../components/common/CategoryBar';
import { ListingCard } from '../components/common/ListingCard';
import { SkeletonListingList } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    selectedCategory,
    setSelectedCategory,
    region,
    checkInDate,
    checkOutDate,
    guests,
    minPrice,
    maxPrice,
    bedrooms,
    beds,
    bathrooms,
    selectedAmenities,
    getActiveFilterCount,
  } = useFilterStore();

  const filterCount = getActiveFilterCount();

  // 1. Fetch Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data.data;
    },
  });

  // 2. Fetch Listings with Filters
  const {
    data: listings = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Listing[]>({
    queryKey: [
      'listings',
      selectedCategory,
      region,
      checkInDate,
      checkOutDate,
      guests,
      minPrice,
      maxPrice,
      bedrooms,
      beds,
      bathrooms,
      selectedAmenities,
    ],
    queryFn: async () => {
      const params: any = { limit: 20 };
      if (selectedCategory) params.categoryId = selectedCategory;
      if (region) params.region = region;
      if (checkInDate) params.checkIn = checkInDate;
      if (checkOutDate) params.checkOut = checkOutDate;
      if (guests > 1) params.guests = guests;
      if (minPrice !== null) params.minPrice = minPrice;
      if (maxPrice !== null) params.maxPrice = maxPrice;
      if (bedrooms !== null) params.bedrooms = bedrooms;
      if (beds !== null) params.beds = beds;
      if (bathrooms !== null) params.bathrooms = bathrooms;
      if (selectedAmenities.length > 0) params.amenityIds = selectedAmenities;

      const res = await apiClient.get('/listings', { params });
      return res.data.data;
    },
  });

  const renderSearchHeader = () => (
    <View className="flex-row items-center px-4 py-3 bg-white gap-2">
      {/* Search Pill Bar */}
      <TouchableOpacity
        onPress={() => navigation.navigate('SearchSheet')}
        activeOpacity={0.8}
        className="flex-1 flex-row items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-3 shadow-sm"
      >
        <Search size={18} color="#00BCD4" />
        <View className="flex-1 ml-3">
          <Text className="text-xs font-bold text-gray-900">
            {region ? region : 'Anywhere in the World'}
          </Text>
          <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>
            {checkInDate ? `${checkInDate} • ${guests} guests` : 'Any week • Add guests'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Filter Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('FilterSheet')}
        activeOpacity={0.8}
        className="w-11 h-11 rounded-full border border-gray-200 bg-white items-center justify-center shadow-sm relative"
      >
        <SlidersHorizontal size={18} color={filterCount > 0 ? '#00BCD4' : '#222222'} />
        {filterCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-[#00BCD4] rounded-full w-4 h-4 items-center justify-center">
            <Text className="text-[10px] font-bold text-white">{filterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {renderSearchHeader()}

      <CategoryBar
        categories={categories}
        selectedCategoryId={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {isLoading ? (
        <SkeletonListingList count={3} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<MapPin size={48} color="#00BCD4" />}
          title="No accommodations found"
          description="Try loosening your search filters or selecting another category to discover more stays."
          actionTitle="Reset All Filters"
          onAction={() => {
            useFilterStore.getState().resetFilters();
          }}
        />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
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
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};
