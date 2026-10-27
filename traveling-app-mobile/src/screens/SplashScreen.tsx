import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Compass } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { apiClient } from '../services/apiClient';

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Ping ngầm /health để đánh thức Render cold start nếu có
        await apiClient.get('/health', { timeout: 4000 }).catch(() => {});
      } finally {
        setTimeout(() => {
          navigation.replace('MainTabs');
        }, 1200);
      }
    };

    initializeApp();
  }, [navigation]);

  return (
    <View className="flex-1 bg-primary items-center justify-center p-6">
      <View className="w-24 h-24 rounded-3xl bg-white/20 items-center justify-center mb-6">
        <Compass size={56} color="#FFFFFF" />
      </View>
      <Text className="text-3xl font-extrabold text-white tracking-wider mb-2">
        TRAVELING
      </Text>
      <Text className="text-sm font-medium text-white/80 mb-8">
        Discover Unique Stays Worldwide
      </Text>
      <ActivityIndicator size="small" color="#FFFFFF" />
    </View>
  );
};
