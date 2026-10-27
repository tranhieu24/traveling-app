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
import { CalendarCheck, Calendar, ArrowRight } from 'lucide-react-native';
import { RootStackParamList, Booking } from '../types';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/common/EmptyState';
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
        return { bg: 'bg-primary-50', text: 'text-primary', label: 'Confirmed' };
      case 'pending':
        return { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Pending' };
      case 'cancelled':
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' };
      default:
        return { bg: 'bg-gray-100', text: 'text-dark', label: status };
    }
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <EmptyState
          icon={<CalendarCheck size={48} color="#00BCD4" />}
          title="Sign in to view your bookings"
          description="Keep track of your upcoming and past trips in one place."
          actionTitle="Sign In"
          onAction={() => navigation.navigate('Login')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 py-4 border-b border-gray-100">
        <Text className="text-2xl font-extrabold text-dark">
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
              className={`flex-1 py-1.5 items-center rounded-lg ${
                isActive ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isActive ? 'text-primary' : 'text-dark-muted'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <SkeletonListingList count={2} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={48} color="#00BCD4" />}
          title="No bookings found"
          description="You don't have any reservations under this category yet."
          actionTitle="Find Stays"
          onAction={() => navigation.navigate('MainTabs')}
        />
      ) : (
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
            const price = typeof item.total_price === 'number'
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
                        <Text className="text-[10px] font-bold text-dark-muted tracking-wider uppercase">
                          {item.booking_code}
                        </Text>
                        <View className={`px-2 py-0.5 rounded-full ${badge.bg}`}>
                          <Text className={`text-[10px] font-bold ${badge.text}`}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>

                      <Text className="text-sm font-bold text-dark leading-5" numberOfLines={1}>
                        {item.listing_title}
                      </Text>
                      <Text className="text-xs text-dark-muted" numberOfLines={1}>
                        {item.listing_city}, {item.listing_country}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <View className="flex-row items-center">
                        <Calendar size={12} color="#717171" className="mr-1" />
                        <Text className="text-[11px] text-dark-muted">
                          {new Date(item.check_in_date).toLocaleDateString()} - {new Date(item.check_out_date).toLocaleDateString()}
                        </Text>
                      </View>

                      <Text className="text-xs font-bold text-primary">
                        ${price.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};
