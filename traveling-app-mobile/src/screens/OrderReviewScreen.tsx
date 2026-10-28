import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  SafeAreaView,
  TextInput,
} from 'react-native';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreditCard, Calendar, Users, ShieldCheck } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { apiClient } from '../services/apiClient';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';

export const OrderReviewScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'OrderReview'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { quote } = route.params;
  const queryClient = useQueryClient();
  const submittingRef = useRef(false);

  const [specialRequests, setSpecialRequests] = useState('');
  const cardNumber = '4242 •••• •••• 4242';
  const mockCardLast4 = '4242';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleConfirmPay = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPaymentError(null);
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/bookings', {
        listingId: quote.listingId,
        checkInDate: quote.checkInDate,
        checkOutDate: quote.checkOutDate,
        guests: quote.guests,
        specialRequests: specialRequests.trim() || undefined,
        paymentMethod: 'mock_credit_card',
        mockCardLast4: mockCardLast4 || '4242',
      });

      const booking = res.data.data?.booking;
      if (!res.data.success || !booking?.id || !booking?.booking_code) {
        throw new Error('Your booking could not be confirmed. Please try again.');
      }

      void queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
      void queryClient.invalidateQueries({ queryKey: ['listing_detail', quote.listingId] });
      navigation.replace('BookingSuccess', {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
      });
    } catch (error: unknown) {
      setPaymentError(axios.isAxiosError(error)
        ? error.response?.data?.error?.message || 'Could not connect to the server. Please try again.'
        : error instanceof Error ? error.message : 'Your booking could not be confirmed. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Confirm and Pay" />

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {/* Listing Summary Card */}
        <View className="flex-row pb-5 mb-5 border-b border-gray-100">
          <Image
            source={{
              uri:
                quote.coverPhoto ||
                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
            }}
            className="w-24 h-24 rounded-2xl bg-gray-200 mr-4"
            resizeMode="cover"
          />
          <View className="flex-1 justify-center">
            <Text className="text-sm font-bold text-dark leading-5 mb-1" numberOfLines={2}>
              {quote.title}
            </Text>
            <Text className="text-xs text-dark-muted font-medium mb-1">
              {quote.city}
            </Text>
            <Text className="text-xs text-primary font-bold">
              ${quote.pricePerNight} / night
            </Text>
          </View>
        </View>

        {/* Your Trip Details */}
        <View className="pb-5 mb-5 border-b border-gray-100">
          <Text className="text-base font-bold text-dark mb-4">Your Trip</Text>

          {/* Dates */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Calendar size={18} color="#717171" className="mr-2.5" />
              <View className="ml-2">
                <Text className="text-xs font-bold text-dark">Dates</Text>
                <Text className="text-xs text-dark-muted">
                  {quote.checkInDate} to {quote.checkOutDate} ({quote.totalNights} nights)
                </Text>
              </View>
            </View>
          </View>

          {/* Guests */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Users size={18} color="#717171" className="mr-2.5" />
              <View className="ml-2">
                <Text className="text-xs font-bold text-dark">Guests</Text>
                <Text className="text-xs text-dark-muted">{quote.guests} traveler(s)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Special Requests */}
        <View className="pb-5 mb-5 border-b border-gray-100">
          <Text className="text-base font-bold text-dark mb-2">Special Requests</Text>
          <TextInput
            value={specialRequests}
            onChangeText={setSpecialRequests}
            maxLength={500}
            editable={!isSubmitting}
            placeholder="Early check-in, quiet room, anniversary notes..."
            multiline
            numberOfLines={3}
            className="border border-gray-200 rounded-xl p-3 text-xs text-dark bg-gray-50 h-20"
          />
        </View>

        {/* Price Details Breakdown */}
        <View className="pb-5 mb-5 border-b border-gray-100">
          <Text className="text-base font-bold text-dark mb-4">Price Details</Text>

          <View className="flex-row justify-between mb-2">
            <Text className="text-xs text-dark">
              ${quote.pricePerNight} x {quote.totalNights} nights
            </Text>
            <Text className="text-xs font-semibold text-dark">
              ${quote.basePriceTotal.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-xs text-dark">Cleaning fee</Text>
            <Text className="text-xs font-semibold text-dark">
              ${quote.cleaningFee.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-xs text-dark">Traveling service fee</Text>
            <Text className="text-xs font-semibold text-dark">
              ${quote.serviceFee.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row justify-between pt-3 border-t border-gray-100">
            <Text className="text-sm font-extrabold text-dark">Total (USD)</Text>
            <Text className="text-base font-extrabold text-primary">
              ${quote.totalPrice.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment Method */}
        <View className="pb-6 mb-4">
          <Text className="text-base font-bold text-dark mb-3">Pay with (Mock Payment)</Text>
          <View className="flex-row items-center justify-between border border-primary bg-primary-50 p-4 rounded-xl">
            <View className="flex-row items-center">
              <CreditCard size={20} color="#00BCD4" />
              <View className="ml-3">
                <Text className="text-xs font-bold text-dark">{cardNumber}</Text>
                <Text className="text-[10px] text-dark-muted">Expires 12/28 • Mock Card</Text>
              </View>
            </View>
            <ShieldCheck size={18} color="#00BCD4" />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Confirm Button */}
      <View className="p-4 border-t border-gray-200 bg-white">
        {!!paymentError && (
          <View className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100">
            <Text accessibilityRole="alert" className="text-xs text-red-700 leading-5">{paymentError}</Text>
          </View>
        )}
        <Button
          title={isSubmitting ? 'Confirming your booking...' : `Confirm & Pay $${quote.totalPrice.toFixed(2)}`}
          onPress={handleConfirmPay}
          loading={isSubmitting}
          variant="primary"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
};
