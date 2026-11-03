import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronLeft, RefreshCw, Star } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchReviewPage, fetchReviewSummary } from '../services/listingDetail';
import { ReviewCard } from '../components/listing/ReviewCard';

export const AllReviewsScreen: React.FC = () => {
  const {params:{listingId,listingTitle}}=useRoute<RouteProp<RootStackParamList,'AllReviews'>>();
  const navigation=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {user}=useAuth();
  const result=useInfiniteQuery({queryKey:['listing_reviews',listingId,'pages'],initialPageParam:1,queryFn:({pageParam,signal})=>fetchReviewPage(listingId,pageParam,12,signal),getNextPageParam:(last,_all,page)=>page<last.totalPages?page+1:undefined});
  const summary=useQuery({queryKey:['listing_reviews',listingId,'summary'],queryFn:({signal})=>fetchReviewSummary(listingId,signal)});
  const reviews=[...new Map(result.data?.pages.flatMap(page=>page.reviews).map(review=>[review.id,review])||[]).values()];
  const stats=summary.data;
  const refresh=()=>{void result.refetch();void summary.refetch();};
  return <SafeAreaView edges={['top','bottom']} style={s.screen}><View style={s.frame}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại từ đánh giá" style={s.icon} onPress={()=>navigation.canGoBack()?navigation.goBack():navigation.replace('ListingDetail',{listingId})}><ChevronLeft size={26} color="#617483"/></Pressable><Text accessibilityRole="header" style={s.headerTitle}>Đánh giá của khách</Text><Pressable accessibilityRole="button" accessibilityLabel="Tải lại đánh giá" onPress={refresh} style={s.icon}><RefreshCw size={18} color="#617483"/></Pressable></View>
    {result.isLoading ? <View style={s.center}><ActivityIndicator color="#008A9A"/></View> : result.isError&&!reviews.length ? <View style={s.center}><Text style={s.emptyTitle}>Chưa tải được đánh giá</Text><Pressable onPress={refresh} style={s.button}><Text style={s.buttonText}>Thử lại</Text></Pressable></View> : <FlatList data={reviews} keyExtractor={item=>item.id} renderItem={({item})=><ReviewCard review={item}/>} contentContainerStyle={s.content}
      ListHeaderComponent={<>
        {stats ? <><View style={s.summary}><Text style={s.score}>{stats.total?stats.average.toFixed(1):'—'}<Text style={s.outOf}>/5</Text></Text><Text style={s.total}>{stats.total} đánh giá · Điểm tổng thể</Text></View><View style={s.chart}>{[5,4,3,2,1].map(star=><View key={star} style={s.chartRow}><Text style={s.starLabel}>{star}</Text><Star size={12} color="#EAC44C" fill="#EAC44C"/><View accessibilityRole="progressbar" accessibilityLabel={`${star} sao`} accessibilityValue={{min:0,max:stats.total||1,now:stats.counts[star-1]}} style={s.track}><View style={[s.fill,{width:`${stats.total?stats.counts[star-1]/stats.total*100:0}%`}]}/></View><Text style={s.chartCount}>{stats.counts[star-1]}</Text></View>)}</View></> : summary.isError ? <Pressable onPress={()=>void summary.refetch()} style={s.button}><Text>Chưa tải được thống kê. Chạm để thử lại.</Text></Pressable> : <ActivityIndicator/>}
      </>}
      ListEmptyComponent={<View style={s.center}><Text style={s.emptyTitle}>Chưa có đánh giá</Text><Text style={s.copy}>Đánh giá sẽ xuất hiện sau khi khách hoàn thành lưu trú.</Text></View>}
      ListFooterComponent={<View style={{gap:12,paddingVertical:16}}>{result.isFetchNextPageError&&<Text accessibilityRole="alert">Chưa tải được trang tiếp theo. Các đánh giá đã tải vẫn được giữ.</Text>}{result.hasNextPage&&<Pressable accessibilityRole="button" disabled={result.isFetchingNextPage} onPress={()=>void result.fetchNextPage()} style={s.button}><Text style={s.buttonText}>{result.isFetchingNextPage?'Đang tải...':'Xem thêm Đánh giá'}</Text></Pressable>}</View>}/>
    }
    <View style={s.footer}><Text style={s.eligibility}>Chỉ khách đã hoàn thành lưu trú mới được viết đánh giá.</Text><Pressable accessibilityRole="button" accessibilityLabel="Viết đánh giá cho chỗ ở" style={s.write} onPress={()=>user?navigation.navigate('WriteReview',{listingId,listingTitle:listingTitle||'Chỗ ở của bạn'}):navigation.navigate('Login')}><Text style={s.writeText}>Viết đánh giá</Text></Pressable></View>
  </View></SafeAreaView>;
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
