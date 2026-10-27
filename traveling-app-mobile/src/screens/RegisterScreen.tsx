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
import { Lock, Mail, User as UserIcon, ArrowLeft } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp, isLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Required', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    try {
      await signUp(email.trim(), password, fullName.trim());
      Alert.alert('Account Created', 'Registration successful! Welcome to Traveling App.', [
        { text: 'Continue', onPress: () => navigation.replace('MainTabs') },
      ]);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'Could not register user.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mt-6 mb-8"
        >
          <ArrowLeft size={20} color="#222222" />
        </TouchableOpacity>

        <Text className="text-3xl font-extrabold text-dark mb-2">
          Create account
        </Text>
        <Text className="text-sm text-dark-muted mb-8">
          Join millions of travelers discovering extraordinary places.
        </Text>

        <View className="space-y-4 mb-6">
          <View>
            <Text className="text-xs font-semibold text-dark mb-1.5 uppercase">
              Full Name
            </Text>
            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <UserIcon size={18} color="#717171" className="mr-3" />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Sarah Jenkins"
                className="flex-1 text-sm text-dark"
              />
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-xs font-semibold text-dark mb-1.5 uppercase">
              Email Address
            </Text>
            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <Mail size={18} color="#717171" className="mr-3" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="sarah@example.com"
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
                placeholder="Min. 6 characters"
                secureTextEntry
                className="flex-1 text-sm text-dark"
              />
            </View>
          </View>
        </View>

        <Button
          title="Sign Up"
          onPress={handleRegister}
          loading={isLoading}
          variant="primary"
          size="lg"
          className="mt-4"
        />

        <View className="flex-row items-center justify-center mt-auto pt-8">
          <Text className="text-xs text-dark-muted">Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-xs font-bold text-primary">Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
