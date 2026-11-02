import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ShieldCheck,
  User as UserIcon,
  Settings,
  CreditCard,
  HelpCircle,
  ChevronRight,
  LogOut,
  LogIn,
  Edit3,
} from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutPending = useRef(false);

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
    if (logoutPending.current) return;
    setLogoutError('');
    setLogoutVisible(true);
  };

  const confirmLogout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setIsLoggingOut(true);
    setLogoutError('');
    try {
      await signOut();
      setLogoutVisible(false);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch {
      setLogoutError('Could not log out. Please try again.');
    } finally {
      logoutPending.current = false;
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile Card */}
        <View className="p-6 bg-white border-b border-gray-100">
          <View className="flex-row items-center">
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                className="w-20 h-20 rounded-full bg-cyan-100 mr-4"
              />
            ) : (
              <View className="w-20 h-20 bg-cyan-100 rounded-full items-center justify-center mr-4">
                <UserIcon size={36} color="#00BCD4" />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">
                {user ? user.full_name : 'Welcome to Traveling'}
              </Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                {user ? user.email : 'Log in to manage your account and bookings'}
              </Text>
              {user && (
                <View className="mt-2 bg-cyan-50 px-2.5 py-0.5 rounded-full self-start">
                  <Text className="text-[11px] font-semibold text-[#00BCD4] uppercase">
                    {user.role || 'Guest'}
                  </Text>
                </View>
              )}
            </View>

            {user && (
              <TouchableOpacity
                onPress={() => setIsEditing(!isEditing)}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center ml-2"
                activeOpacity={0.7}
              >
                <Edit3 size={16} color="#4B5563" />
              </TouchableOpacity>
            )}
          </View>

          {/* Edit Name Section */}
          {user && isEditing && (
            <View className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Full Name
              </Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                className="border border-gray-300 rounded-lg p-3 bg-white text-sm text-gray-900 mb-3"
                placeholder="Enter your name"
              />
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isSaving}
                activeOpacity={0.85}
                className="bg-[#00BCD4] py-2.5 px-4 rounded-lg items-center"
              >
                <Text className="text-white font-semibold text-sm">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Menu Items Block */}
        <View className="px-5 py-3">
          {user?.role === 'admin' && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Admin Portal" onPress={() => navigation.navigate('AdminPortal')} className="flex-row items-center py-4 border-b border-gray-100">
            <View className="w-10 h-10 rounded-full bg-cyan-50 items-center justify-center mr-3"><ShieldCheck size={20} color="#00BCD4" /></View>
            <Text className="flex-1 text-sm font-medium text-gray-800">Admin Portal</Text><ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>}
          {/* 1. Personal Information */}
          <TouchableOpacity
            onPress={() => {
              if (user) setIsEditing(!isEditing);
              else navigation.navigate('Login');
            }}
            className="flex-row items-center py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3.5">
              <UserIcon size={20} color="#00BCD4" />
            </View>
            <Text className="text-sm font-semibold text-gray-800 flex-1">
              Personal Information
            </Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* 2. Payments & Payouts */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Payments & Payouts"
            onPress={() => navigation.navigate(user ? 'PaymentsPayouts' : 'Login')}
            className="flex-row items-center py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3.5">
              <CreditCard size={20} color="#00BCD4" />
            </View>
            <Text className="text-sm font-semibold text-gray-800 flex-1">
              Payments & Payouts
            </Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* 3. Settings & Notifications */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Settings & Notifications"
            onPress={() => navigation.navigate('Settings')}
            className="flex-row items-center py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3.5">
              <Settings size={20} color="#00BCD4" />
            </View>
            <Text className="text-sm font-semibold text-gray-800 flex-1">
              Settings & Notifications
            </Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* 4. Help Center */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Help Center"
            onPress={() => navigation.navigate('HelpCenter')}
            className="flex-row items-center py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3.5">
              <HelpCircle size={20} color="#00BCD4" />
            </View>
            <Text className="text-sm font-semibold text-gray-800 flex-1">
              Help Center
            </Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Log Out / Log In Button */}
          {user ? (
            <TouchableOpacity
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Log Out"
              disabled={isLoggingOut}
              activeOpacity={0.8}
              className="border border-gray-300 rounded-xl py-3 items-center mt-6 flex-row justify-center"
            >
              <LogOut size={18} color="#EF4444" className="mr-2" />
              <Text className="text-sm font-semibold text-red-500 ml-2">
                Log Out
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
              className="bg-[#00BCD4] rounded-xl py-3 items-center mt-6 flex-row justify-center"
            >
              <LogIn size={18} color="#FFFFFF" className="mr-2" />
              <Text className="text-sm font-semibold text-white ml-2">
                Log In / Sign Up
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!logoutPending.current) setLogoutVisible(false); }}
      >
        <View style={logoutStyles.overlay}>
          <View style={logoutStyles.card} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={logoutStyles.title}>Log out?</Text>
            <Text style={logoutStyles.message}>Are you sure you want to log out?</Text>
            {!!logoutError && <Text accessibilityRole="alert" style={logoutStyles.error}>{logoutError}</Text>}
            <View style={logoutStyles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel log out"
                disabled={isLoggingOut}
                onPress={() => setLogoutVisible(false)}
                style={logoutStyles.cancelButton}
              >
                <Text style={logoutStyles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm log out"
                disabled={isLoggingOut}
                onPress={confirmLogout}
                style={[logoutStyles.confirmButton, isLoggingOut && logoutStyles.busy]}
              >
                {isLoggingOut && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text style={logoutStyles.confirmLabel}>{isLoggingOut ? 'Logging out...' : 'Log Out'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const logoutStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#292C30' },
  message: { fontSize: 15, lineHeight: 22, color: '#6B7280', marginTop: 12 },
  error: { fontSize: 14, lineHeight: 20, color: '#DC2626', marginTop: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: { flex: 1, minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  confirmButton: { flex: 1, minHeight: 46, borderRadius: 10, backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmLabel: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  busy: { opacity: 0.65 },
});
