import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Calendar } from 'lucide-react-native';
import { RootStackParamList, Booking } from '../types';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { SkeletonListingList } from '../components/common/SkeletonLoader';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'pending', label: 'Pending' },
  { key: 'cancelled', label: 'Cancelled' },
];

export const BookingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const {
    data: bookings = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Booking[]>({
    queryKey: ['my_bookings', user?.id, selectedStatus],
    queryFn: async () => {
      if (!user) return [];
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
      const res = await apiClient.get('/bookings', { params });
      return res.data.data;
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Confirmed' };
      case 'pending':
        return { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Pending' };
      case 'cancelled':
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    }
  };

  const renderEmptyState = () => (
    <View className="bg-gray-50 flex-1 justify-center items-center px-6">
      <CalendarCheck size={64} color="#00BCD4" />
      <Text className="text-2xl font-bold text-gray-800 mt-4 mb-2 text-center">
        No trips booked... yet!
      </Text>
      <Text className="text-sm text-gray-500 text-center max-w-xs leading-5">
        Time to dust off your bags and start planning your next adventure.
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('MainTabs')}
        activeOpacity={0.85}
        className="bg-[#00BCD4] py-3 px-8 rounded-xl shadow-sm mt-6"
      >
        <Text className="text-white font-semibold text-base text-center">
          Start searching
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
      ) : !user || bookings.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Header */}
          <View className="px-5 py-4 border-b border-gray-100 bg-white">
            <Text className="text-2xl font-bold text-gray-900">
              Trips & Bookings
            </Text>
          </View>

          {/* Tabs Filter Bar */}
          <View className="flex-row px-4 py-2 border-b border-gray-100 bg-gray-50">
            {STATUS_TABS.map((tab) => {
              const isActive = selectedStatus === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setSelectedStatus(tab.key)}
                  className={`flex-1 py-2 items-center rounded-lg ${
                    isActive ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isActive ? 'text-[#00BCD4]' : 'text-gray-500'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#00BCD4"
              />
            }
            renderItem={({ item }) => {
              const badge = getStatusBadge(item.booking_status);
              const price =
                typeof item.total_price === 'number'
                  ? item.total_price
                  : parseFloat(item.total_price || '0');

              return (
                <TouchableOpacity
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                  activeOpacity={0.85}
                  className="mb-4 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm p-4"
                >
                  <View className="flex-row">
                    <Image
                      source={{
                        uri:
                          item.cover_photo ||
                          'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
                      }}
                      className="w-20 h-20 rounded-xl bg-gray-200 mr-3.5"
                      resizeMode="cover"
                    />

                    <View className="flex-1 justify-between">
                      <View>
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                            {item.booking_code}
                          </Text>
                          <View className={`px-2 py-0.5 rounded-full ${badge.bg}`}>
                            <Text className={`text-[10px] font-bold ${badge.text}`}>
                              {badge.label}
                            </Text>
                          </View>
                        </View>

                        <Text className="text-sm font-bold text-gray-900 leading-5" numberOfLines={1}>
                          {item.listing_title}
                        </Text>
                        <Text className="text-xs text-gray-500" numberOfLines={1}>
                          {item.listing_city}, {item.listing_country}
                        </Text>
                      </View>

                      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <View className="flex-row items-center">
                          <Calendar size={12} color="#717171" />
                          <Text className="text-[11px] text-gray-500 ml-1">
                            {new Date(item.check_in_date).toLocaleDateString()} -{' '}
                            {new Date(item.check_out_date).toLocaleDateString()}
                          </Text>
                        </View>

                        <Text className="text-xs font-bold text-[#00BCD4]">
                          ${price.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
};
