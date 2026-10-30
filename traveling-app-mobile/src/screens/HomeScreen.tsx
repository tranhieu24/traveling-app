import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useAuth } from '../context/AuthContext';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const hasInitializedCategory = useRef(false);
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
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (hasInitializedCategory.current || categories.length === 0) return;
    hasInitializedCategory.current = true;
    if (!selectedCategory) {
      const beach = categories.find((category) => category.slug === 'beach');
      if (beach) setSelectedCategory(beach.id);
    }
  }, [categories, selectedCategory, setSelectedCategory]);

  // 2. Fetch Listings with Filters
  const {
    data: listings = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery<Listing[]>({
    queryKey: [
      'listings',
      user?.id,
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
      const params: Record<string, string | number | string[]> = { limit: 20 };
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
    <View style={styles.searchRow}>
      <View style={styles.searchField}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Where do you want to stay?"
          accessibilityHint="Choose a destination, travel dates, and guests"
          onPress={() => navigation.navigate('SearchSheet')}
          activeOpacity={0.8}
          style={styles.searchButton}
        >
          <Search size={21} color="#292C30" strokeWidth={2} />
          <View style={styles.searchCopy}>
            <Text style={[styles.searchPlaceholder, !!region && styles.searchValue]} numberOfLines={1}>
              {region || 'Where do you want to stay?'}
            </Text>
            {!!checkInDate && (
              <Text style={styles.searchDetails} numberOfLines={1}>
                {checkInDate} · {guests} {guests === 1 ? 'guest' : 'guests'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={filterCount > 0 ? `Filters, ${filterCount} active` : 'Filters'}
          onPress={() => navigation.navigate('FilterSheet')}
          activeOpacity={0.8}
          style={styles.filterButton}
        >
          <SlidersHorizontal size={18} color={filterCount > 0 ? '#00BCD4' : '#808892'} />
          {filterCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterCount}>{filterCount}</Text></View>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        {renderSearchHeader()}

        <CategoryBar
          categories={categories}
          selectedCategoryId={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </View>

      <View style={styles.listArea}>
        {isLoading || categoriesLoading ? (
          <SkeletonListingList count={3} />
        ) : isError || categoriesError ? (
          <EmptyState
            icon={<MapPin size={44} color="#00BCD4" />}
            title="Unable to load stays"
            description="Please check your connection and try again."
            actionTitle="Try again"
            onAction={() => { void Promise.all([refetch(), refetchCategories()]); }}
          />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={<MapPin size={48} color="#00BCD4" />}
            title="No accommodations found"
            description="Try loosening your search filters or selecting another category to discover more stays."
            actionTitle="Reset All Filters"
            onAction={() => useFilterStore.getState().resetFilters()}
          />
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={async () => { await refetch(); }} tintColor="#00BCD4" />
            }
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ECFCFE' },
  header: { backgroundColor: '#ECFCFE' },
  searchRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  searchField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#C9CDD1', borderRadius: 8, backgroundColor: '#FFFFFF' },
  searchButton: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18, paddingRight: 6, paddingVertical: 10 },
  searchCopy: { flex: 1 },
  searchPlaceholder: { fontSize: 16, lineHeight: 22, color: '#B8BDC5' },
  searchValue: { color: '#292C30' },
  searchDetails: { color: '#93979F', fontSize: 12, lineHeight: 17, marginTop: 2 },
  filterButton: { width: 40, height: 44, marginRight: 4, alignItems: 'center', justifyContent: 'center' },
  filterBadge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#00BCD4', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterCount: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  listArea: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 4 },
});
