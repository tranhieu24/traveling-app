import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { useFilterStore } from '../store/useFilterStore';
import { buildListingParams, searchDateLabel } from '../utils/search';
import { fetchListingPage } from '../services/search';
import { ListingCard } from '../components/common/ListingCard';
import { SkeletonListingList } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { Checkbox, CYAN } from '../components/search/SearchControls';

export const SearchResultsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const state = useFilterStore();
  const { user } = useAuth();
  let params: Record<string, string | number | boolean> = {},
    invalid = '';
  try {
    params = buildListingParams(state);
  } catch (failure) {
    invalid = (failure as Error).message;
  }
  const results = useInfiniteQuery({
    queryKey: ['search_results', user?.id, params],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => fetchListingPage(params, pageParam, signal),
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages ? page.pagination.page + 1 : undefined,
    enabled: !invalid,
  });
  const listings = [
    ...new Map(
      results.data?.pages
        .flatMap((page) => page.listings)
        .map((listing) => [listing.id, listing]) || []
    ).values(),
  ];
  const count = state.getActiveFilterCount(),
    hasDates = !!state.checkInDate && !!state.checkOutDate;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}>
      <View style={s.header}>
        <View style={s.searchBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit search"
            onPress={() => navigation.navigate('SearchSheet')}
            style={s.search}
          >
            <Search size={22} color="#4E5761" />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={s.destination}>
                {state.destination.label}
              </Text>
              <Text numberOfLines={1} style={s.details}>
                {searchDateLabel(state.checkInDate, state.checkOutDate)} {'\u00b7'} {state.guests}{' '}
                {state.guests === 1 ? 'guest' : 'guests'}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filters${count ? `, ${count} active` : ''}`}
            onPress={() => navigation.navigate('FilterSheet')}
            style={s.icon}
          >
            <SlidersHorizontal size={21} color={count ? CYAN : '#929AA5'} />
            {count > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{count}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search and browse categories"
            onPress={state.resetFilters}
            style={s.icon}
          >
            <X size={18} color="#929AA5" />
          </Pressable>
        </View>
      </View>
      <View style={s.priceToggle}>
        <Checkbox
          label="Present total price"
          description={hasDates ? 'Includes taxes and fees' : 'Choose dates to see your trip total'}
          checked={state.showTotalPrice}
          onPress={() =>
            hasDates
              ? state.setShowTotalPrice(!state.showTotalPrice)
              : navigation.navigate('SearchSheet', { step: 'when' })
          }
        />
      </View>
      {!invalid && !results.isLoading && !results.isError && (
        <Text style={s.count}>
          {results.data?.pages[0]?.pagination.total || 0}{' '}
          {results.data?.pages[0]?.pagination.total === 1 ? 'stay' : 'stays'} available
        </Text>
      )}
      {invalid || (results.isError && !listings.length) ? (
        <EmptyState
          title="Unable to load stays"
          description={invalid || 'Please check your connection and try again.'}
          actionTitle={invalid ? 'Edit search' : 'Try again'}
          onAction={() => (invalid ? navigation.navigate('SearchSheet') : void results.refetch())}
        />
      ) : results.isLoading ? (
        <SkeletonListingList count={3} />
      ) : !listings.length ? (
        <EmptyState
          title="No stays match your search"
          description="Try other dates, fewer guests, or broader filters."
          actionTitle="Edit search"
          onAction={() => navigation.navigate('SearchSheet')}
        />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={results.isRefetching && !results.isFetchingNextPage}
              onRefresh={() => void results.refetch()}
              tintColor={CYAN}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (results.hasNextPage && !results.isFetching) void results.fetchNextPage();
          }}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              showTotalPrice={state.showTotalPrice}
              showBedroomCount
              onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            />
          )}
          ListFooterComponent={
            results.isFetchingNextPage ? (
              <ActivityIndicator color={CYAN} style={{ padding: 20 }} />
            ) : results.isFetchNextPageError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => results.fetchNextPage()}
                style={{ padding: 20 }}
              >
                <Text style={{ textAlign: 'center', color: CYAN }}>
                  Could not load more stays. Try again
                </Text>
              </Pressable>
            ) : results.isError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => results.refetch()}
                style={{ padding: 20 }}
              >
                <Text style={{ color: CYAN }}>Could not refresh stays. Try again</Text>
              </Pressable>
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
};
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  searchBar: {
    borderWidth: 1,
    borderColor: '#C9CDD1',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  search: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 11,
  },
  destination: { fontSize: 15, color: '#41464E' },
  details: { fontSize: 12, color: '#A0A7B0', marginTop: 3 },
  icon: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderRadius: 8,
    backgroundColor: CYAN,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: { color: 'white', fontSize: 10 },
  priceToggle: {
    borderWidth: 1,
    borderColor: '#E2E5E9',
    borderRadius: 6,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  count: { color: '#8B939D', fontSize: 12, marginHorizontal: 20, marginBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 12 },
});
