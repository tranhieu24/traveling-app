import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  User as UserIcon,
  Settings,
  CreditCard,
  Shield,
  LogOut,
  ChevronRight,
  Edit3,
} from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { Button } from '../components/common/Button';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiClient.patch('/auth/me', {
        fullName: fullName.trim(),
      });
      if (res.data.success) {
        await refreshProfile();
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.replace('MainTabs');
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
        <View className="w-20 h-20 rounded-full bg-primary-50 items-center justify-center mb-4">
          <UserIcon size={40} color="#00BCD4" />
        </View>
        <Text className="text-xl font-bold text-dark text-center mb-2">
          Your Traveling Profile
        </Text>
        <Text className="text-xs text-dark-muted text-center max-w-xs mb-6">
          Log in or sign up to manage your account and view reservations.
        </Text>
        <Button
          title="Log In / Sign Up"
          onPress={() => navigation.navigate('Login')}
          variant="primary"
          size="lg"
          className="w-full"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View className="flex-row items-center pb-6 border-b border-gray-100">
          <Image
            source={{
              uri:
                user.avatar_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
            }}
            className="w-16 h-16 rounded-full bg-gray-200 mr-4"
          />
          <View className="flex-1">
            <Text className="text-lg font-bold text-dark">{user.full_name}</Text>
            <Text className="text-xs text-dark-muted">{user.email}</Text>
            <View className="mt-1 bg-primary-50 px-2 py-0.5 rounded-full self-start">
              <Text className="text-[10px] font-bold text-primary uppercase">
                {user.role || 'Guest'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
          >
            <Edit3 size={16} color="#222222" />
          </TouchableOpacity>
        </View>

        {/* Edit Profile Section */}
        {isEditing && (
          <View className="py-4 border-b border-gray-100 bg-gray-50 p-4 rounded-xl mt-3">
            <Text className="text-xs font-semibold text-dark mb-1.5 uppercase">
              Update Full Name
            </Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              className="border border-gray-300 rounded-lg p-2.5 bg-white text-xs text-dark mb-3"
            />
            <Button
              title="Save Changes"
              onPress={handleSaveProfile}
              loading={isSaving}
              variant="primary"
              size="sm"
            />
          </View>
        )}

        {/* Menu Options */}
        <View className="py-4">
          <TouchableOpacity className="flex-row items-center py-3.5 border-b border-gray-100">
            <Settings size={20} color="#717171" className="mr-3" />
            <Text className="text-xs font-semibold text-dark ml-3 flex-1">
              Account Settings
            </Text>
            <ChevronRight size={18} color="#B0B0B0" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-3.5 border-b border-gray-100">
            <CreditCard size={20} color="#717171" className="mr-3" />
            <Text className="text-xs font-semibold text-dark ml-3 flex-1">
              Payment Methods
            </Text>
            <ChevronRight size={18} color="#B0B0B0" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-3.5 border-b border-gray-100">
            <Shield size={20} color="#717171" className="mr-3" />
            <Text className="text-xs font-semibold text-dark ml-3 flex-1">
              Privacy & Security
            </Text>
            <ChevronRight size={18} color="#B0B0B0" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center py-4 mt-6"
        >
          <LogOut size={20} color="#FF5A5F" />
          <Text className="text-xs font-bold text-accent ml-3">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
