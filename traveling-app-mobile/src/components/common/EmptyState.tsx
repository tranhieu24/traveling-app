import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  onAction,
}) => {
  return (
    <View className="items-center justify-center p-8 my-auto">
      {icon && <View className="mb-4">{icon}</View>}
      <Text className="text-lg font-bold text-dark text-center mb-2">
        {title}
      </Text>
      {description && (
        <Text className="text-sm text-dark-muted text-center mb-6 leading-5">
          {description}
        </Text>
      )}
      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="md"
        />
      )}
    </View>
  );
};
