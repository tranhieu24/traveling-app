import { useUiPreferences, uiStyle, uiClasses, uiColor, uiText, uiTextStyle } from '../preferences/ui';
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
  Bell,
} from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';

export const ProfileScreen: React.FC = () => {
  useUiPreferences();
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
      Alert.alert('Bắt buộc', 'Họ và tên không được để trống.');
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
        Alert.alert('Thành công', 'Đã cập nhật hồ sơ.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.error?.message || 'Không thể cập nhật hồ sơ.');
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
      setLogoutError('Không thể đăng xuất. Vui lòng thử lại.');
    } finally {
      logoutPending.current = false;
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={uiStyle({ flex: 1, backgroundColor: '#FFFFFF' })}
    >
      <ScrollView
        style={uiStyle({ flex: 1 })}
        contentContainerStyle={uiStyle({ paddingBottom: 24 })}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile Card */}
        <View className={uiClasses("p-6 bg-white border-b border-gray-100")}>
          <View className={uiClasses("flex-row items-center")}>
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                className={uiClasses("w-20 h-20 rounded-full bg-cyan-100 mr-4")}
              />
            ) : (
              <View className={uiClasses("w-20 h-20 bg-cyan-100 rounded-full items-center justify-center mr-4")}>
                <UserIcon size={36} color={uiColor("#00BCD4")} />
              </View>
            )}

            <View className={uiClasses("flex-1")}>
              <Text className={uiClasses("text-xl font-bold text-gray-900")}>
                {user ? user.full_name : uiText('Chào mừng đến với Traveling')}
              </Text>
              <Text className={uiClasses("text-sm text-gray-500 mt-0.5")}>
                {user ? user.email : uiText('Đăng nhập để quản lý tài khoản và đơn đặt chỗ')}
              </Text>
              {user && (
                <View className={uiClasses("mt-2 bg-cyan-50 px-2.5 py-0.5 rounded-full self-start")}>
                  <Text className={uiClasses("text-[11px] font-semibold text-[#00BCD4] uppercase")}>
                    {uiText(user.role || "Khách")}
                  </Text>
                </View>
              )}
            </View>

            {user && (
              <TouchableOpacity
                onPress={() => setIsEditing(!isEditing)}
                className={uiClasses("w-9 h-9 rounded-full bg-gray-100 items-center justify-center ml-2")}
                activeOpacity={0.7}
              >
                <Edit3 size={16} color={uiColor("#4B5563")} />
              </TouchableOpacity>
            )}
          </View>

          {/* Edit Name Section */}
          {user && isEditing && (
            <View className={uiClasses("mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100")}>
              <Text className={uiClasses("text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide")}>{uiText("Họ và tên")}</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                className={uiClasses("border border-gray-300 rounded-lg p-3 bg-white text-sm text-gray-900 mb-3")}
                placeholder={uiText("Nhập họ và tên")}
              />
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isSaving}
                activeOpacity={0.85}
                className={uiClasses("bg-[#00BCD4] py-2.5 px-4 rounded-lg items-center")}
              >
                <Text className={uiClasses("text-white font-semibold text-sm")}>
                  {isSaving ? uiText('Đang lưu...') : uiText('Lưu thay đổi')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Menu Items Block */}
        <View className={uiClasses("px-5 py-3")}>
          {user?.role === 'admin' && <TouchableOpacity accessibilityRole="button" accessibilityLabel={uiText("Cổng quản trị")} onPress={() => navigation.navigate('AdminPortal')} className={uiClasses("flex-row items-center py-4 border-b border-gray-100")}>
            <View className={uiClasses("w-10 h-10 rounded-full bg-cyan-50 items-center justify-center mr-3")}><ShieldCheck size={20} color={uiColor("#00BCD4")} /></View>
            <Text className={uiClasses("flex-1 text-sm font-medium text-gray-800")}>{uiText("Cổng quản trị")}</Text><ChevronRight size={18} color={uiColor("#9CA3AF")} />
          </TouchableOpacity>}
          {/* 1. Personal Information */}
          <TouchableOpacity
            onPress={() => {
              if (user) setIsEditing(!isEditing);
              else navigation.navigate('Login');
            }}
            className={uiClasses("flex-row items-center py-4 border-b border-gray-100")}
            activeOpacity={0.7}
          >
            <View className={uiClasses("w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3.5")}>
              <UserIcon size={20} color={uiColor("#00BCD4")} />
            </View>
            <Text className={uiClasses("text-sm font-semibold text-gray-800 flex-1")}>{uiText("Thông tin cá nhân")}</Text>
            <ChevronRight size={18} color={uiColor("#9CA3AF")} />
          </TouchableOpacity>

          {/* 2. Payments & Payouts */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={uiText("Thanh toán và nhận tiền")}
            onPress={() => navigation.navigate(user ? 'PaymentsPayouts' : 'Login')}
            className={uiClasses("flex-row items-center py-4 border-b border-gray-100")}
            activeOpacity={0.7}
          >
            <View className={uiClasses("w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3.5")}>
              <CreditCard size={20} color={uiColor("#00BCD4")} />
            </View>
            <Text className={uiClasses("text-sm font-semibold text-gray-800 flex-1")}>{uiText("Thanh toán và nhận tiền")}</Text>
            <ChevronRight size={18} color={uiColor("#9CA3AF")} />
          </TouchableOpacity>

          {/* 3. Settings & Notifications */}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={uiText("Thông báo của tôi")}
            onPress={() => navigation.navigate('Notifications')} className={uiClasses("flex-row items-center py-4 border-b border-gray-100")} activeOpacity={0.7}>
            <View className={uiClasses("w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3.5")}><Bell size={20} color={uiColor("#00BCD4")} /></View>
            <Text className={uiClasses("text-sm font-semibold text-gray-800 flex-1")}>{uiText("Thông báo")}</Text>
            <ChevronRight size={18} color={uiColor("#9CA3AF")} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={uiText("Cài đặt và thông báo")}
            onPress={() => navigation.navigate("Settings")}
            className={uiClasses("flex-row items-center py-4 border-b border-gray-100")}
            activeOpacity={0.7}
          >
            <View className={uiClasses("w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3.5")}>
              <Settings size={20} color={uiColor("#00BCD4")} />
            </View>
            <Text className={uiClasses("text-sm font-semibold text-gray-800 flex-1")}>{uiText("Cài đặt và thông báo")}</Text>
            <ChevronRight size={18} color={uiColor("#9CA3AF")} />
          </TouchableOpacity>

          {/* 4. Help Center */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={uiText("Trung tâm trợ giúp")}
            onPress={() => navigation.navigate('HelpCenter')}
            className={uiClasses("flex-row items-center py-4 border-b border-gray-100")}
            activeOpacity={0.7}
          >
            <View className={uiClasses("w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3.5")}>
              <HelpCircle size={20} color={uiColor("#00BCD4")} />
            </View>
            <Text className={uiClasses("text-sm font-semibold text-gray-800 flex-1")}>{uiText("Trợ giúp")}</Text>
            <ChevronRight size={18} color={uiColor("#9CA3AF")} />
          </TouchableOpacity>

          {/* Log Out / Log In Button */}
          {user ? (
            <TouchableOpacity
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel={uiText("Đăng xuất")}
              disabled={isLoggingOut}
              activeOpacity={0.8}
              className={uiClasses("border border-gray-300 rounded-xl py-3 items-center mt-6 flex-row justify-center")}
            >
              <LogOut size={18} color={uiColor("#EF4444")} className={uiClasses("mr-2")} />
              <Text className={uiClasses("text-sm font-semibold text-red-500 ml-2")}>{uiText("Đăng xuất")}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
              className={uiClasses("bg-[#00BCD4] rounded-xl py-3 items-center mt-6 flex-row justify-center")}
            >
              <LogIn size={18} color={uiColor("#FFFFFF")} className={uiClasses("mr-2")} />
              <Text className={uiClasses("text-sm font-semibold text-white ml-2")}>{uiText("Đăng nhập / Đăng ký")}</Text>
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
        <View style={uiStyle(logoutStyles.overlay)}>
          <View style={uiStyle(logoutStyles.card)} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={uiTextStyle(logoutStyles.title)}>{uiText("Đăng xuất?")}</Text>
            <Text style={uiTextStyle(logoutStyles.message)}>{uiText("Bạn có muốn đăng xuất khỏi tài khoản?")}</Text>
            {!!logoutError && <Text accessibilityRole="alert" style={uiTextStyle(logoutStyles.error)}>{uiText(logoutError)}</Text>}
            <View style={uiStyle(logoutStyles.actions)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Hủy đăng xuất")}
                disabled={isLoggingOut}
                onPress={() => setLogoutVisible(false)}
                style={uiStyle(logoutStyles.cancelButton)}
              >
                <Text style={uiTextStyle(logoutStyles.cancelLabel)}>{uiText("Hủy")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Xác nhận đăng xuất")}
                disabled={isLoggingOut}
                onPress={confirmLogout}
                style={uiStyle([logoutStyles.confirmButton, isLoggingOut && logoutStyles.busy])}
              >
                {isLoggingOut && <ActivityIndicator size="small" color={uiColor("#FFFFFF")} />}
                <Text style={uiTextStyle(logoutStyles.confirmLabel)}>{isLoggingOut ? uiText('Đang đăng xuất...') : uiText('Đăng xuất')}</Text>
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
