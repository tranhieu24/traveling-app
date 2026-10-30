import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, RefreshCw, Star } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchAllListingReviews } from '../services/listingDetail';
import { reviewStats } from '../utils/listingDetail';
import { ReviewCard } from '../components/listing/ReviewCard';

export const AllReviewsScreen: React.FC = () => {
  const {
    params: { listingId, listingTitle },
  } = useRoute<RouteProp<RootStackParamList, 'AllReviews'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const result = useQuery({
    queryKey: ['listing_reviews', listingId, 'all'],
    queryFn: ({ signal }) => fetchAllListingReviews(listingId, signal),
  });
  const stats = reviewStats(result.data || []);
  const back = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.replace('ListingDetail', { listingId });
  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.screen}>
      <View style={s.frame}>
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back from guest reviews"
            onPress={back}
            style={s.icon}
          >
            <ChevronLeft size={26} color="#929BA7" />
          </Pressable>
          <Text accessibilityRole="header" style={s.headerTitle}>
            Reviews
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh guest reviews"
            disabled={result.isFetching}
            onPress={() => void result.refetch()}
            style={s.icon}
          >
            <RefreshCw size={17} color="#9BA6B3" />
          </Pressable>
        </View>
        {result.isLoading ? (
          <View style={s.center}>
            <ActivityIndicator color="#00B8CE" />
          </View>
        ) : result.isError ? (
          <View style={s.center}>
            <Text style={s.emptyTitle}>Unable to load reviews</Text>
            <Text style={s.copy}>Please check your connection and try again.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry all guest reviews"
              onPress={() => result.refetch()}
              style={s.button}
            >
              <Text style={s.buttonText}>Try again</Text>
            </Pressable>
          </View>
        ) : !stats.total ? (
          <View style={s.center}>
            <Star size={36} color="#EAC44C" />
            <Text style={s.emptyTitle}>No reviews yet</Text>
            <Text style={s.copy}>This stay has no guest reviews yet.</Text>
          </View>
        ) : (
          <FlatList
            data={result.data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.content}
            renderItem={({ item }) => <ReviewCard review={item} />}
            ListHeaderComponent={
              <>
                <View style={s.summary}>
                  <Text style={s.score}>
                    {stats.average.toFixed(1)}
                    <Text style={s.outOf}>/5</Text>
                  </Text>
                  <Text style={s.total}>
                    {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
                  </Text>
                </View>
                <View style={s.chart}>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <View key={star} style={s.chartRow}>
                      <Text style={s.starLabel}>{star}</Text>
                      <Star size={12} color="#EAC44C" fill="#EAC44C" />
                      <View
                        accessibilityRole="progressbar"
                        accessibilityLabel={`${star} star reviews`}
                        accessibilityValue={{
                          min: 0,
                          max: stats.total,
                          now: stats.counts[star - 1],
                          text: `${stats.counts[star - 1]} of ${stats.total} reviews`,
                        }}
                        style={s.track}
                      >
                        <View
                          style={[
                            s.fill,
                            { width: `${(stats.counts[star - 1] / stats.total) * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={s.chartCount}>{stats.counts[star - 1]}</Text>
                    </View>
                  ))}
                </View>
              </>
            }
          />
        )}
        <View style={s.footer}>
          <Text style={s.eligibility}>Reviews can be submitted after a completed stay.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Write a review for this stay"
            onPress={() =>
              user
                ? navigation.navigate('WriteReview', {
                    listingId,
                    listingTitle: listingTitle || 'Your stay',
                  })
                : navigation.navigate('Login')
            }
            style={s.write}
          >
            <Text style={s.writeText}>Write a review</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F2F5' },
  frame: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: 'white' },
  header: {
    minHeight: 66,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#596370', fontSize: 16, fontWeight: '600' },
  content: { padding: 20, paddingTop: 12, paddingBottom: 24 },
  summary: { alignItems: 'center', paddingVertical: 15 },
  score: { color: '#596573', fontSize: 38, fontWeight: '600' },
  outOf: { fontSize: 17, color: '#ABB2BC' },
  total: { color: '#99A3AE', fontSize: 12, marginTop: 6 },
  chart: {
    paddingVertical: 22,
    marginBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F3',
  },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 5 },
  starLabel: { width: 12, color: '#8D98A6', fontSize: 11 },
  track: { flex: 1, height: 6, backgroundColor: '#F0F2F5', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#00B8CE', borderRadius: 4 },
  chartCount: { width: 24, textAlign: 'right', color: '#99A4B0', fontSize: 10 },
  center: { flex: 1, padding: 26, justifyContent: 'center', alignItems: 'center', gap: 14 },
  emptyTitle: { color: '#586574', fontSize: 20, fontWeight: '600' },
  copy: { color: '#97A1AE', fontSize: 13, textAlign: 'center', lineHeight: 22 },
  button: {
    backgroundColor: '#00B8CE',
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 6,
  },
  buttonText: { color: 'white', fontWeight: '600' },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F4',
    alignItems: 'center',
  },
  eligibility: { color: '#A0AAB6', fontSize: 10, marginBottom: 7 },
  write: { padding: 8 },
  writeText: { color: '#00A9BE', fontSize: 12, fontWeight: '600' },
});
