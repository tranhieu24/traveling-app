import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { MessageSquare } from 'lucide-react-native';

export const InboxScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="p-5 border-b border-gray-100 bg-white">
        <Text className="text-2xl font-bold text-gray-900">
          Messages
        </Text>
      </View>

      {/* Content Empty State */}
      <View className="bg-gray-50 flex-1 justify-center items-center px-6">
        <View className="w-20 h-20 bg-cyan-50 rounded-full items-center justify-center mb-2">
          <MessageSquare size={48} color="#00BCD4" />
        </View>
        <Text className="text-xl font-bold text-gray-800 mt-4 mb-2 text-center">
          No messages yet
        </Text>
        <Text className="text-sm text-gray-500 text-center max-w-xs leading-5">
          When you book a stay or contact hosts, your messages will show up here.
        </Text>
      </View>
    </SafeAreaView>
  );
};
