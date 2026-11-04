import React, { useState } from 'react';
import axios from 'axios';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CalendarCheck, Calendar } from 'lucide-react-native';
import { RootStackParamList, Booking } from '../types';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { SkeletonListingList } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';

const STATUS_TABS = [
  { key: 'all', label: "Tất cả" },
  { key: 'confirmed', label: "Đã xác nhận" },
  { key: 'pending', label: "Chờ thanh toán" },
  { key: 'cancelled', label: "Đã hủy" },
];

export const BookingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const {
    data: bookings = [],
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useQuery<Booking[]>({
    queryKey: ['my_bookings', user?.id, selectedStatus],
    queryFn: async () => {
      if (!user) return [];
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
      const res = await apiClient.get('/bookings', { params });
      if (!res.data.success || !Array.isArray(res.data.data)) throw new Error('Không thể tải đơn đặt chỗ.');
      return res.data.data;
    },
    enabled: !authLoading && !!user,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', label: "Đã xác nhận" };
      case 'pending':
        return { bg: 'bg-amber-50', text: 'text-amber-600', label: "Chờ thanh toán" };
      case 'cancelled':
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: "Đã hủy" };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    }
  };

  const emptyCopy: Record<string, { title: string; description: string }> = {
    all: { title: 'Bạn chưa đặt chuyến đi nào!', description: 'Hãy bắt đầu lên kế hoạch cho hành trình tiếp theo.' },
    confirmed: { title: 'Chưa có đơn đã xác nhận', description: 'Các đơn được xác nhận sẽ xuất hiện tại đây.' },
    pending: { title: 'Không có đơn đang chờ', description: 'Bạn không có đơn nào đang chờ xác nhận.' },
    cancelled: { title: "Chưa có đơn đã hủy", description: "Các đơn bạn hủy sẽ xuất hiện tại đây." },
  };
  const currentEmpty = emptyCopy[selectedStatus] || emptyCopy.all;
  const sessionExpired = axios.isAxiosError(error) && error.response?.status === 401;

  const renderEmptyState = () => (
    <View className="bg-gray-50 flex-1 justify-center items-center px-6">
      <CalendarCheck size={64} color="#00BCD4" />
      <Text className="text-xl font-bold text-gray-800 mt-4 mb-2 text-center">{currentEmpty.title}</Text>
      <Text className="text-sm text-gray-500 text-center max-w-xs leading-5">{currentEmpty.description}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={selectedStatus === 'all' ? 'Bắt đầu tìm kiếm' : 'Xem tất cả đơn đặt chỗ'}
        onPress={() => selectedStatus === 'all' ? navigation.navigate('MainTabs', { screen: 'SearchTab' }) : setSelectedStatus('all')}
        activeOpacity={0.85}
        className="bg-[#00BCD4] py-3 px-8 rounded-xl shadow-sm mt-6"
      >
        <Text className="text-white font-semibold text-base text-center">{selectedStatus === 'all' ? 'Bắt đầu tìm kiếm' : 'Xem tất cả đơn đặt chỗ'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <View className="px-5 py-4 border-b border-gray-100 bg-white">
        <Text className="text-2xl font-bold text-gray-900">Chuyến đi và đặt chỗ</Text>
      </View>
      {user && (
        <View className="flex-row px-4 py-2 border-b border-gray-100 bg-gray-50">
          {STATUS_TABS.map((tab) => {
            const isActive = selectedStatus === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                accessibilityRole="tab"
                accessibilityLabel={`Booking status: ${tab.label}`}
                accessibilityState={{ selected: isActive }}
                aria-selected={isActive}
                onPress={() => setSelectedStatus(tab.key)}
                className={`flex-1 py-2 items-center rounded-lg ${isActive ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`text-xs font-bold ${isActive ? 'text-[#00BCD4]' : 'text-gray-500'}`}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {authLoading || (!!user && isLoading) ? (
        <View className="flex-1 p-4 bg-white"><SkeletonListingList count={2} /></View>
      ) : !user ? (
        <View className="flex-1 bg-gray-50">
          <EmptyState icon={<CalendarCheck size={56} color="#00BCD4" />} title="Log in to view your bookings" description="Your reservations will appear here after you log in." actionTitle="Đăng nhập" onAction={() => navigation.navigate('Login')} />
        </View>
      ) : isError ? (
        <View className="flex-1 bg-gray-50">
          <EmptyState
            icon={<AlertCircle size={48} color="#00BCD4" />}
            title="Unable to load bookings"
            description={sessionExpired ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Vui lòng kiểm tra kết nối rồi thử lại.'}
            actionTitle={sessionExpired ? "Đăng nhập" : "Thử lại"}
            onAction={() => { if (sessionExpired) navigation.navigate('Login'); else void refetch(); }}
          />
        </View>
      ) : bookings.length === 0 ? renderEmptyState() : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
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
      )}
    </SafeAreaView>
  );
};
