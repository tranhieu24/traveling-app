import { useUiPreferences, uiClasses, uiText } from '../../preferences/ui';
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
  useUiPreferences();
  return (
    <View className={uiClasses("items-center justify-center p-8 my-auto")}>
      {icon && <View className={uiClasses("mb-4")}>{icon}</View>}
      <Text className={uiClasses("text-lg font-bold text-dark text-center mb-2")}>
        {uiText(title)}
      </Text>
      {description && (
        <Text className={uiClasses("text-sm text-dark-muted text-center mb-6 leading-5")}>
          {uiText(description)}
        </Text>
      )}
      {actionTitle && onAction && (
        <Button
          title={uiText(actionTitle)}
          onPress={onAction}
          variant="primary"
          size="md"
        />
      )}
    </View>
  );
};
