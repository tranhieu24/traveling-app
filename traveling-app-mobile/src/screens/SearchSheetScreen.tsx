import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { X, Globe, Plus, Minus, Calendar, Users } from 'lucide-react-native';
import { useFilterStore } from '../store/useFilterStore';
import { Button } from '../components/common/Button';

const REGIONS = [
  { name: 'Anywhere', value: null, icon: '🌏' },
  { name: 'Asia', value: 'Asia', icon: '🏯' },
  { name: 'Europe', value: 'Europe', icon: '🏰' },
  { name: 'North America', value: 'North America', icon: '🗽' },
];

export const SearchSheetScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    region,
    setRegion,
    checkInDate,
    checkOutDate,
    setDates,
    guests,
    setGuests,
    resetFilters,
  } = useFilterStore();

  const [activeTab, setActiveTab] = useState<'where' | 'when' | 'who'>('where');

  // Helper date preset
  const setQuickDate = (daysFromNow: number, stayDuration: number) => {
    const today = new Date();
    const inDate = new Date(today);
    inDate.setDate(today.getDate() + daysFromNow);

    const outDate = new Date(inDate);
    outDate.setDate(inDate.getDate() + stayDuration);

    const format = (d: Date) => d.toISOString().split('T')[0];
    setDates(format(inDate), format(outDate));
  };

  const handleSearch = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
        >
          <X size={18} color="#222222" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-dark">Where to?</Text>
        <TouchableOpacity onPress={resetFilters}>
          <Text className="text-xs font-semibold text-dark-muted underline">Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* SECTION 1: WHERE */}
        <View className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <View className="flex-row items-center mb-3">
            <Globe size={20} color="#00BCD4" />
            <Text className="text-sm font-bold text-dark ml-2">Where to go</Text>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {REGIONS.map((item) => {
              const isSelected = region === item.value;
              return (
                <TouchableOpacity
                  key={item.name}
                  onPress={() => setRegion(item.value)}
                  className={`w-[48%] mb-3 p-3 rounded-xl border ${
                    isSelected ? 'border-primary bg-primary-50' : 'border-gray-200 bg-white'
                  }`}
                  activeOpacity={0.8}
                >
                  <Text className="text-2xl mb-1">{item.icon}</Text>
                  <Text className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-dark'}`}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION 2: WHEN */}
        <View className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <View className="flex-row items-center mb-3">
            <Calendar size={20} color="#00BCD4" />
            <Text className="text-sm font-bold text-dark ml-2">When is your trip?</Text>
          </View>

          {/* Quick date presets */}
          <View className="flex-row space-x-2 mb-3">
            <TouchableOpacity
              onPress={() => setQuickDate(3, 3)}
              className="flex-1 bg-white border border-gray-200 rounded-xl py-2 px-3 items-center"
            >
              <Text className="text-xs font-semibold text-dark">This Weekend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setQuickDate(7, 4)}
              className="flex-1 bg-white border border-gray-200 rounded-xl py-2 px-3 items-center"
            >
              <Text className="text-xs font-semibold text-dark">Next Week</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDates(null, null)}
              className="flex-1 bg-white border border-gray-200 rounded-xl py-2 px-3 items-center"
            >
              <Text className="text-xs font-semibold text-dark">Anytime</Text>
            </TouchableOpacity>
          </View>

          {checkInDate && checkOutDate && (
            <View className="p-3 bg-primary-50 rounded-xl border border-primary/20">
              <Text className="text-xs font-bold text-primary text-center">
                Selected: {checkInDate} → {checkOutDate}
              </Text>
            </View>
          )}
        </View>

        {/* SECTION 3: WHO */}
        <View className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Users size={20} color="#00BCD4" />
              <View className="ml-2">
                <Text className="text-sm font-bold text-dark">Guests</Text>
                <Text className="text-xs text-dark-muted">Ages 13 or above</Text>
              </View>
            </View>

            {/* Stepper */}
            <View className="flex-row items-center space-x-3">
              <TouchableOpacity
                onPress={() => setGuests(Math.max(1, guests - 1))}
                disabled={guests <= 1}
                className={`w-9 h-9 rounded-full border items-center justify-center ${
                  guests <= 1 ? 'border-gray-200 bg-gray-100 opacity-40' : 'border-gray-300 bg-white'
                }`}
              >
                <Minus size={16} color="#222222" />
              </TouchableOpacity>

              <Text className="text-sm font-bold text-dark w-6 text-center">
                {guests}
              </Text>

              <TouchableOpacity
                onPress={() => setGuests(guests + 1)}
                className="w-9 h-9 rounded-full border border-gray-300 bg-white items-center justify-center"
              >
                <Plus size={16} color="#222222" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Bottom Search Bar */}
      <View className="p-4 border-t border-gray-200 bg-white">
        <Button
          title="Search Accommodations"
          onPress={handleSearch}
          variant="primary"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
};
