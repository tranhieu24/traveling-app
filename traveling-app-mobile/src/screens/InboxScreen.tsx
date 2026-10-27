import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { EmptyState } from '../components/common/EmptyState';

export const InboxScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 py-4 border-b border-gray-100">
        <Text className="text-2xl font-extrabold text-dark">Inbox</Text>
      </View>
      <EmptyState
        icon={<MessageSquare size={48} color="#00BCD4" />}
        title="No messages yet"
        description="When you connect with hosts or make reservations, you will find your conversations here."
      />
    </SafeAreaView>
  );
};
