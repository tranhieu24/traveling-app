import { useUiPreferences, uiClasses, uiColor, uiText, uiStyle } from '../preferences/ui';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  useUiPreferences();
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
    <View className={uiClasses("bg-gray-50 flex-1 justify-center items-center px-6")}>
      <Heart size={64} color={uiColor("#FF5A5F")} fill={uiColor("#FF5A5F")} />
      <Text className={uiClasses("text-2xl font-bold text-gray-800 mt-4 mb-2 text-center")}>{uiText("Danh sách yêu thích")}</Text>
      <Text className={uiClasses("text-sm text-gray-500 text-center max-w-xs leading-5")}>{uiText("Lưu những chỗ ở bạn yêu thích để dễ dàng tìm lại sau này.")}</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('MainTabs', { screen: 'SearchTab' })}
        activeOpacity={0.85}
        className={uiClasses("bg-[#00BCD4] py-3 px-8 rounded-xl shadow-sm mt-6")}
      >
        <Text className={uiClasses("text-white font-semibold text-base text-center")}>{uiText("Khám phá chỗ ở")}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={uiStyle({ flex: 1, backgroundColor: '#FFFFFF' })}
    >
      {isLoading ? (
        <View className={uiClasses("flex-1 p-4 bg-white")}>
          <SkeletonListingList count={2} />
        </View>
      ) : !user || favorites.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <View className={uiClasses("px-5 py-4 border-b border-gray-100 bg-white")}>
            <Text className={uiClasses("text-2xl font-bold text-gray-900")}>{uiText("Danh sách yêu thích")}</Text>
            <Text className={uiClasses("text-xs text-gray-500 mt-0.5")}>
              {uiText(favorites.length)}{uiText(" chỗ ở đã lưu")}</Text>
          </View>
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            contentContainerStyle={uiStyle({ padding: 16 })}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
                tintColor={uiColor("#00BCD4")}
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
