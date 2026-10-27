import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import {
  Calendar,
  Users,
  MapPin,
  CreditCard,
  FileText,
  AlertTriangle,
  Phone,
} from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { apiClient, API_BASE_URL } from '../services/apiClient';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';

export const BookingDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'BookingDetail'>>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { bookingId } = route.params;

  const [isCancelling, setIsCancelling] = useState(false);

  const { data: booking, isLoading, refetch } = useQuery({
    queryKey: ['booking_detail', bookingId],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/${bookingId}`);
      return res.data.data;
    },
  });

  const handleOpenReceipt = async () => {
    try {
      const receiptUrl = `${API_BASE_URL}/payments/${bookingId}/receipt`;
      await Linking.openURL(receiptUrl);
    } catch (e: any) {
      Alert.alert('Cannot Open Receipt', 'Unable to stream PDF invoice.');
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this booking? A refund will be initiated.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              const res = await apiClient.patch(`/bookings/${bookingId}/cancel`);
              if (res.data.success) {
                Alert.alert('Booking Cancelled', 'Your reservation was cancelled and payment refunded.');
                queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
                refetch();
              }
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error?.message || 'Could not cancel booking.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading || !booking) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#00BCD4" />
      </View>
    );
  }

  const isConfirmed = booking.booking_status === 'confirmed';
  const isCancelled = booking.booking_status === 'cancelled';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Reservation Details" />

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View
          className={`p-4 rounded-2xl mb-5 flex-row items-center justify-between ${
            isConfirmed ? 'bg-primary-50' : isCancelled ? 'bg-gray-100' : 'bg-amber-50'
          }`}
        >
          <View>
            <Text
              className={`text-sm font-extrabold uppercase ${
                isConfirmed ? 'text-primary' : isCancelled ? 'text-gray-600' : 'text-amber-700'
              }`}
            >
              {booking.booking_status}
            </Text>
            <Text className="text-xs text-dark-muted mt-0.5">
              Code: {booking.booking_code}
            </Text>
          </View>

          {isConfirmed && (
            <TouchableOpacity
              onPress={handleOpenReceipt}
              className="flex-row items-center bg-white px-3 py-1.5 rounded-lg border border-primary/30 shadow-sm"
            >
              <FileText size={14} color="#00BCD4" />
              <Text className="text-xs font-bold text-primary ml-1.5">PDF Receipt</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Accommodation Info Card */}
        <View className="flex-row pb-5 mb-5 border-b border-gray-100">
          <Image
            source={{
              uri:
                booking.cover_photo ||
                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
            }}
            className="w-24 h-24 rounded-2xl bg-gray-200 mr-4"
          />
          <View className="flex-1 justify-center">
            <Text className="text-sm font-bold text-dark leading-5 mb-1" numberOfLines={2}>
              {booking.listing_title}
            </Text>
            <Text className="text-xs text-dark-muted font-medium mb-1">
              {booking.listing_city}, {booking.listing_country}
            </Text>
            <Text className="text-xs text-dark font-medium">
              Hosted by {booking.host_name || 'Host'}
            </Text>
          </View>
        </View>

        {/* Timeline Dates */}
        <View className="pb-5 mb-5 border-b border-gray-100">
          <Text className="text-base font-bold text-dark mb-3">Reservation Dates</Text>
          <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-xl">
            <View>
              <Text className="text-[10px] uppercase font-bold text-dark-muted">Check-in</Text>
              <Text className="text-xs font-bold text-dark mt-0.5">
                {new Date(booking.check_in_date).toDateString()}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-[11px] font-bold text-primary">
                {booking.total_nights} nights
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] uppercase font-bold text-dark-muted">Check-out</Text>
              <Text className="text-xs font-bold text-dark mt-0.5">
                {new Date(booking.check_out_date).toDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <View className="pb-5 mb-5 border-b border-gray-100">
          <Text className="text-base font-bold text-dark mb-3">Payment Summary</Text>
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-xs text-dark">Base Price</Text>
            <Text className="text-xs font-semibold text-dark">
              ${parseFloat(booking.base_price_total || '0').toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-xs text-dark">Cleaning Fee</Text>
            <Text className="text-xs font-semibold text-dark">
              ${parseFloat(booking.cleaning_fee || '0').toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between mb-3">
            <Text className="text-xs text-dark">Service Fee</Text>
            <Text className="text-xs font-semibold text-dark">
              ${parseFloat(booking.service_fee || '0').toFixed(2)}
            </Text>
          </View>
          <View className="flex-row justify-between pt-2 border-t border-gray-100">
            <Text className="text-sm font-bold text-dark">Total Amount</Text>
            <Text className="text-sm font-bold text-primary">
              ${parseFloat(booking.total_price || '0').toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Host Contact */}
        {booking.host_phone && (
          <View className="pb-5 mb-5 border-b border-gray-100 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Phone size={18} color="#00BCD4" />
              <View className="ml-3">
                <Text className="text-xs font-bold text-dark">Host Contact</Text>
                <Text className="text-xs text-dark-muted">{booking.host_phone}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Cancellation Section */}
        {isConfirmed && (
          <View className="mt-2 mb-6">
            <Button
              title="Cancel Reservation"
              onPress={handleCancelBooking}
              loading={isCancelling}
              variant="outline"
              size="md"
              className="border-accent text-accent"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
