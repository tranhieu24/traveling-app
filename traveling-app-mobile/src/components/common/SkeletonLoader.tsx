import React from 'react';
import { View } from 'react-native';

export const SkeletonCard: React.FC = () => {
  return (
    <View className="mb-6 bg-white rounded-2xl overflow-hidden border border-gray-100 p-4">
      <View className="w-full h-60 bg-gray-200 rounded-xl mb-4 animate-pulse" />
      <View className="flex-row justify-between mb-2">
        <View className="w-1/2 h-4 bg-gray-200 rounded" />
        <View className="w-12 h-4 bg-gray-200 rounded" />
      </View>
      <View className="w-3/4 h-3 bg-gray-200 rounded mb-3" />
      <View className="w-1/4 h-5 bg-gray-200 rounded" />
    </View>
  );
};

export const SkeletonListingList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View className="p-4">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </View>
  );
};
