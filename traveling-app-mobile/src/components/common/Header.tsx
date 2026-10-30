import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightComponent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = true,
  onBack,
  rightComponent,
}) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-dark-border">
      <View className="w-10 items-start">
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-10 h-10 rounded-full items-center justify-center bg-gray-50 active:bg-gray-200"
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#222222" />
          </TouchableOpacity>
        )}
      </View>

      <Text className="text-base font-bold text-dark flex-1 text-center" numberOfLines={1}>
        {title || ''}
      </Text>

      <View className="w-10 items-end">{rightComponent}</View>
    </View>
  );
};
