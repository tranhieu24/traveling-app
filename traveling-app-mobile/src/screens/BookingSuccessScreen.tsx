import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle2, Ticket } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { Button } from '../components/common/Button';

export const BookingSuccessScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'BookingSuccess'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bookingId, bookingCode } = route.params;

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
      <View className="w-24 h-24 rounded-full bg-primary-50 items-center justify-center mb-6">
        <CheckCircle2 size={64} color="#00BCD4" />
      </View>

      <Text className="text-2xl font-extrabold text-dark text-center mb-2">
        Reservation Confirmed!
      </Text>
      <Text className="text-xs text-dark-muted text-center max-w-xs mb-6">
        Your stay is booked and confirmed. We have sent a confirmation email with all trip details.
      </Text>

      {/* Booking Code Card */}
      <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl p-4 w-full mb-8">
        <Ticket size={24} color="#00BCD4" className="mr-3" />
        <View className="ml-3 flex-1">
          <Text className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">
            Booking Code
          </Text>
          <Text className="text-base font-extrabold text-dark tracking-wide">
            {bookingCode}
          </Text>
        </View>
      </View>

      <View className="w-full space-y-3">
        <Button
          title="View Reservation Details"
          onPress={() => navigation.replace('BookingDetail', { bookingId })}
          variant="primary"
          size="lg"
        />

        <Button
          title="Explore More Places"
          onPress={() => navigation.replace('MainTabs')}
          variant="outline"
          size="md"
          className="mt-3"
        />
      </View>
    </SafeAreaView>
  );
};
