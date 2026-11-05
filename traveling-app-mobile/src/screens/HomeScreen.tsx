import { useUiPreferences, uiStyle, uiText, uiColor, uiTextStyle } from '../preferences/ui';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
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
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { buildListingParams } from '../utils/search';
import { fetchListingPage } from '../services/search';
import { SearchResultsScreen } from './SearchResultsScreen';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react-native';
import { RootStackParamList, Category } from '../types';
import { apiClient } from '../services/apiClient';
import { useFilterStore } from '../store/useFilterStore';
import { CategoryBar } from '../components/common/CategoryBar';
import { ListingCard } from '../components/common/ListingCard';
import { SkeletonListingList } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { NotificationBell } from '../components/common/NotificationBell';
import { useAuth } from '../context/AuthContext';

export const HomeScreen: React.FC = () => {
  useUiPreferences();
  const hasSearch = useFilterStore((value) => value.hasSearch);
  return hasSearch ? <SearchResultsScreen /> : <ExploreScreen />;
};

const ExploreScreen: React.FC = () => {
  useUiPreferences();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const state = useFilterStore();
  const {
    selectedCategory,
    setSelectedCategory,
    destination,
    checkInDate,
    guests,
    getActiveFilterCount,
  } = state;
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


  let params: Record<string, string | number | boolean> = {},
    invalid = '';
  try {
    params = buildListingParams(state);
  } catch (failure) {
    invalid = (failure as Error).message;
  }
  const {
    data,
    isLoading,
    isError,
    isRefetching,
    isFetchingNextPage,
    isFetchNextPageError,
    isFetching,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['listings', user?.id, params],
    enabled: !invalid,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => fetchListingPage(params, pageParam, signal),
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages ? page.pagination.page + 1 : undefined,
  });
  const listings = [
    ...new Map(
      data?.pages.flatMap((page) => page.listings).map((listing) => [listing.id, listing]) || []
    ).values(),
  ];

  const renderSearchHeader = () => (
    <View style={uiStyle(styles.searchRow)}>
      <View style={uiStyle(styles.searchField)}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={uiText("Bạn muốn ở đâu?")}
          accessibilityHint={uiText("Chọn điểm đến, ngày đi và số khách")}
          onPress={() => navigation.navigate('SearchSheet')}
          activeOpacity={0.8}
          style={uiStyle(styles.searchButton)}
        >
          <Search size={21} color={uiColor("#292C30")} strokeWidth={2} />
          <View style={uiStyle(styles.searchCopy)}>
            <Text
              style={uiTextStyle([
                styles.searchPlaceholder,
                destination.kind !== 'anywhere' && styles.searchValue,
              ])}
              numberOfLines={1}
            >
              {destination.kind !== 'anywhere' ? uiText(destination.label) : uiText("Bạn muốn ở đâu?")}
            </Text>
            {!!checkInDate && (
              <Text style={uiTextStyle(styles.searchDetails)} numberOfLines={1}>
                {uiText(checkInDate)}{uiText(" · ")}{uiText(guests)} {guests === 1 ? uiText('guest') : uiText('guests')}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={filterCount > 0 ? uiText(`Filters, ${filterCount} active`) : uiText("Bộ lọc")}
          onPress={() => navigation.navigate('FilterSheet')}
          activeOpacity={0.8}
          style={uiStyle(styles.filterButton)}
        >
          <SlidersHorizontal size={18} color={uiColor(filterCount > 0 ? '#00BCD4' : '#808892')} />
          {filterCount > 0 && (
            <View style={uiStyle(styles.filterBadge)}>
              <Text style={uiTextStyle(styles.filterCount)}>{uiText(filterCount)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <NotificationBell />
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={uiStyle(styles.screen)}>
      <View style={uiStyle(styles.header)}>
        {renderSearchHeader()}

        <CategoryBar
          categories={categories}
          selectedCategoryId={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </View>

      <View style={uiStyle(styles.listArea)}>
        {isLoading || categoriesLoading ? (
          <SkeletonListingList count={3} />
        ) : invalid || (isError && !listings.length) || categoriesError ? (
          <EmptyState
            icon={<MapPin size={44} color={uiColor("#00BCD4")} />}
            title={uiText("Chưa tải được chỗ ở")}
            description={uiText(invalid || "Vui lòng kiểm tra kết nối rồi thử lại.")}
            actionTitle={uiText("Thử lại")}
            onAction={() => {
              if (invalid) state.resetFilters();
              else void Promise.all([refetch(), refetchCategories()]);
            }}
          />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={<MapPin size={48} color={uiColor("#00BCD4")} />}
            title={uiText("Chưa tìm thấy chỗ ở phù hợp")}
            description={uiText("Thử điều chỉnh bộ lọc hoặc chọn danh mục khác để khám phá thêm chỗ ở.")}
            actionTitle={uiText("Xóa bộ lọc")}
            onAction={() => useFilterStore.getState().resetFilters()}
          />
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (hasNextPage && !isFetching) void fetchNextPage();
            }}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator color={uiColor("#00BCD4")} style={uiStyle({ padding: 20 })} />
              ) : isFetchNextPageError ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => void fetchNextPage()}
                  style={uiStyle({ padding: 20 })}
                >
                  <Text style={uiTextStyle({ color: '#00BCD4', textAlign: 'center' })}>{uiText("Không thể tải thêm chỗ ở. Thử lại")}</Text>
                </TouchableOpacity>
              ) : undefined
            }
            contentContainerStyle={uiStyle(styles.listContent)}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching && !isFetchingNextPage}
                onRefresh={() => void refetch()}
                tintColor={uiColor("#00BCD4")}
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ECFCFE' },
  header: { backgroundColor: '#ECFCFE' },
  searchRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C9CDD1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  searchButton: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 10,
  },
  searchCopy: { flex: 1 },
  searchPlaceholder: { fontSize: 16, lineHeight: 22, color: '#B8BDC5' },
  searchValue: { color: '#292C30' },
  searchDetails: { color: '#93979F', fontSize: 12, lineHeight: 17, marginTop: 2 },
  filterButton: {
    width: 40,
    height: 44,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00BCD4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCount: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  listArea: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 4 },
});
