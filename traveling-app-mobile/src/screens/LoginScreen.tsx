import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock, Mail, ArrowLeft } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required', 'Please enter email and password');
      return;
    }

    try {
      await signIn(email.trim(), password);
      navigation.replace('MainTabs');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mt-6 mb-8"
        >
          <ArrowLeft size={20} color="#222222" />
        </TouchableOpacity>

        {/* Header */}
        <Text className="text-3xl font-extrabold text-dark mb-2">
          Welcome back
        </Text>
        <Text className="text-sm text-dark-muted mb-8">
          Sign in to access your bookings and favorite stays.
        </Text>

        {/* Inputs */}
        <View className="space-y-4 mb-6">
          <View>
            <Text className="text-xs font-semibold text-dark mb-1.5 uppercase">
              Email address
            </Text>
            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <Mail size={18} color="#717171" className="mr-3" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 text-sm text-dark"
              />
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-xs font-semibold text-dark mb-1.5 uppercase">
              Password
            </Text>
            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <Lock size={18} color="#717171" className="mr-3" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                className="flex-1 text-sm text-dark"
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <Button
          title="Log In"
          onPress={handleLogin}
          loading={isLoading}
          variant="primary"
          size="lg"
          className="mt-4"
        />

        {/* Demo Accounts Helper */}
        <View className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <Text className="text-xs font-bold text-dark mb-1">
            Demo Account Tip:
          </Text>
          <Text className="text-xs text-dark-muted">
            Host: host1@travelingapp.com
          </Text>
          <Text className="text-xs text-dark-muted">
            Guest: guest1@travelingapp.com
          </Text>
        </View>

        {/* Switch to Register */}
        <View className="flex-row items-center justify-center mt-auto pt-8">
          <Text className="text-xs text-dark-muted">Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
            <Text className="text-xs font-bold text-primary">Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
