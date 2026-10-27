import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { X, Check } from 'lucide-react-native';
import { useFilterStore } from '../store/useFilterStore';
import { apiClient } from '../services/apiClient';
import { Amenity } from '../types';
import { Button } from '../components/common/Button';

export const FilterSheetScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    minPrice,
    maxPrice,
    setPriceRange,
    bedrooms,
    beds,
    bathrooms,
    setRooms,
    selectedAmenities,
    toggleAmenity,
    resetFilters,
  } = useFilterStore();

  const { data: amenities = [] } = useQuery<Amenity[]>({
    queryKey: ['amenities'],
    queryFn: async () => {
      const res = await apiClient.get('/amenities');
      return res.data.data;
    },
  });

  const roomOptions = [null, 1, 2, 3, 4];

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
        <Text className="text-base font-bold text-dark">Filters</Text>
        <TouchableOpacity onPress={resetFilters}>
          <Text className="text-xs font-semibold text-dark-muted underline">Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* PRICE RANGE */}
        <View className="mb-6 pb-6 border-b border-gray-100">
          <Text className="text-base font-bold text-dark mb-1">Price Range</Text>
          <Text className="text-xs text-dark-muted mb-4">Nightly prices before taxes and fees</Text>

          <View className="flex-row space-x-4">
            <View className="flex-1 border border-gray-200 rounded-xl p-3 bg-gray-50">
              <Text className="text-[10px] text-dark-muted uppercase font-semibold">Minimum</Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-sm font-bold text-dark mr-1">$</Text>
                <TextInput
                  value={minPrice !== null ? minPrice.toString() : ''}
                  onChangeText={(val) => setPriceRange(val ? parseFloat(val) : null, maxPrice)}
                  placeholder="0"
                  keyboardType="numeric"
                  className="flex-1 text-sm font-bold text-dark"
                />
              </View>
            </View>

            <View className="flex-1 border border-gray-200 rounded-xl p-3 bg-gray-50">
              <Text className="text-[10px] text-dark-muted uppercase font-semibold">Maximum</Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-sm font-bold text-dark mr-1">$</Text>
                <TextInput
                  value={maxPrice !== null ? maxPrice.toString() : ''}
                  onChangeText={(val) => setPriceRange(minPrice, val ? parseFloat(val) : null)}
                  placeholder="1000+"
                  keyboardType="numeric"
                  className="flex-1 text-sm font-bold text-dark"
                />
              </View>
            </View>
          </View>
        </View>

        {/* ROOMS & BEDS */}
        <View className="mb-6 pb-6 border-b border-gray-100">
          <Text className="text-base font-bold text-dark mb-4">Rooms and Beds</Text>

          {/* Bedrooms */}
          <Text className="text-xs font-semibold text-dark mb-2">Bedrooms</Text>
          <View className="flex-row space-x-2 mb-4">
            {roomOptions.map((opt) => (
              <TouchableOpacity
                key={opt === null ? 'any-bed' : opt}
                onPress={() => setRooms(opt, beds, bathrooms)}
                className={`flex-1 py-2 rounded-xl border items-center ${
                  bedrooms === opt ? 'bg-primary border-primary' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-xs font-bold ${bedrooms === opt ? 'text-white' : 'text-dark'}`}>
                  {opt === null ? 'Any' : `${opt}+`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bathrooms */}
          <Text className="text-xs font-semibold text-dark mb-2">Bathrooms</Text>
          <View className="flex-row space-x-2">
            {roomOptions.map((opt) => (
              <TouchableOpacity
                key={opt === null ? 'any-bath' : opt}
                onPress={() => setRooms(bedrooms, beds, opt)}
                className={`flex-1 py-2 rounded-xl border items-center ${
                  bathrooms === opt ? 'bg-primary border-primary' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-xs font-bold ${bathrooms === opt ? 'text-white' : 'text-dark'}`}>
                  {opt === null ? 'Any' : `${opt}+`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* AMENITIES CHECKLIST */}
        <View className="mb-6">
          <Text className="text-base font-bold text-dark mb-3">Amenities</Text>
          <View className="flex-row flex-wrap justify-between">
            {amenities.map((amenity) => {
              const isChecked = selectedAmenities.includes(amenity.id);
              return (
                <TouchableOpacity
                  key={amenity.id}
                  onPress={() => toggleAmenity(amenity.id)}
                  activeOpacity={0.8}
                  className={`w-[48%] mb-3 p-3 rounded-xl border flex-row items-center justify-between ${
                    isChecked ? 'border-primary bg-primary-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold flex-1 mr-1 ${
                      isChecked ? 'text-primary font-bold' : 'text-dark'
                    }`}
                    numberOfLines={1}
                  >
                    {amenity.name}
                  </Text>
                  <View
                    className={`w-5 h-5 rounded-md items-center justify-center border ${
                      isChecked ? 'bg-primary border-primary' : 'border-gray-300'
                    }`}
                  >
                    {isChecked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View className="p-4 border-t border-gray-200 bg-white">
        <Button
          title="Show Results"
          onPress={() => navigation.goBack()}
          variant="primary"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
};
