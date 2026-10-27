import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary active:bg-primary-600 border border-primary text-white';
      case 'secondary':
        return 'bg-dark active:bg-black border border-dark text-white';
      case 'outline':
        return 'bg-transparent border border-dark-border text-dark active:bg-gray-100';
      case 'danger':
        return 'bg-accent active:bg-accent-dark border border-accent text-white';
      default:
        return 'bg-primary text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-2 px-3 rounded-lg';
      case 'lg':
        return 'py-4 px-6 rounded-2xl';
      case 'md':
      default:
        return 'py-3.5 px-5 rounded-xl';
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return 'text-dark font-semibold';
      default:
        return 'text-white font-semibold';
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      case 'md':
      default:
        return 'text-sm';
    }
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center ${getVariantStyles()} ${getSizeStyles()} ${
        disabled || loading ? 'opacity-50' : ''
      } ${className}`}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? '#00BCD4' : '#FFFFFF'}
          className="mr-2"
        />
      ) : icon ? (
        <React.Fragment>{icon}</React.Fragment>
      ) : null}
      <Text className={`${getTextVariantStyles()} ${getTextSizeStyles()} ${icon ? 'ml-2' : ''}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};
