import { uiStyle, uiText, uiColor, uiTextStyle, useUiPreferences } from '../preferences/ui';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Bell, CheckCircle2, Eye, EyeOff, Lock, Languages, Moon, Sun, Monitor, Check } from 'lucide-react-native';
import { preferences } from '../preferences/store';

import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';

type PasswordField = 'current' | 'next' | 'confirm';
type BrowserPermission = NotificationPermission | 'unsupported';
const PASSWORD_FIELDS: { key: PasswordField; label: string }[] = [
  { key: 'current', label: 'Mật khẩu hiện tại' },
  { key: 'next', label: 'Mật khẩu mới' },
  { key: 'confirm', label: 'Xác nhận mật khẩu mới' },
];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isLoading, changePassword } = useAuth();
  const appearance = useUiPreferences();
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<PasswordField | 'form', string>>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const submitting = useRef(false);
  const [permission, setPermission] = useState<BrowserPermission>('unsupported');
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const refresh = () => setPermission('Notification' in window ? window.Notification.permission : 'unsupported');
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const savePassword = async () => {
    if (submitting.current || isLoading) return;
    const nextErrors: typeof errors = {};
    if (!passwords.current) nextErrors.current = 'Nhập mật khẩu hiện tại.';
    if (passwords.next.length < 6) nextErrors.next = 'Sử dụng ít nhất 6 ký tự.';
    else if (passwords.next === passwords.current) nextErrors.next = 'Hãy chọn mật khẩu khác mật khẩu hiện tại.';
    if (passwords.confirm !== passwords.next || !passwords.confirm) nextErrors.confirm = 'Mật khẩu xác nhận không khớp.';
    setErrors(nextErrors);
    setSuccess(false);
    if (Object.keys(nextErrors).length) return;
    submitting.current = true;
    setSaving(true);
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setSuccess(true);
    } catch (error: unknown) {
      setErrors({ form: error instanceof Error ? error.message : 'Không thể cập nhật mật khẩu. Vui lòng thử lại.' });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const enableNotifications = async () => {
    if (notificationBusy) return;
    setNotificationError('');
    setNotificationMessage('');
    setNotificationBusy(true);
    try {
      if (Platform.OS !== 'web') {
        await Linking.openSettings();
      } else if ('Notification' in window) {
        const result = await window.Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') setNotificationMessage('Đã bật thông báo trên trình duyệt.');
        else if (result === 'denied') setNotificationError('Thông báo đang bị chặn. Bạn có thể cho phép trong phần cài đặt trang web của trình duyệt.');
      }
    } catch {
      setNotificationError('Không thể mở cài đặt thông báo. Vui lòng thử lại.');
    } finally {
      setNotificationBusy(false);
    }
  };

  const testNotification = () => {
    setNotificationMessage('');
    setNotificationError('');
    try {
      if (Platform.OS !== 'web' || !('Notification' in window) || window.Notification.permission !== 'granted') return;
      new window.Notification('Traveling', { body: 'Thông báo đã được bật trên trình duyệt này.' });
      setNotificationMessage('Đã gửi thông báo thử nghiệm.');
    } catch {
      setNotificationError('Trình duyệt không thể hiển thị thông báo. Hãy kiểm tra cài đặt thông báo trên thiết bị.');
    }
  };

  const permissionLabel = permission === 'granted' ? 'Đã bật' : permission === 'denied' ? 'Bị chặn' : permission === 'default' ? 'Chưa bật' : 'Không hỗ trợ';

  return (
    <SafeAreaView style={uiStyle(styles.screen)}>
      <View style={uiStyle(styles.header)}>
        <Pressable
          accessibilityRole="button" accessibilityLabel={uiText("Quay lại hồ sơ")}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('MainTabs', { screen: 'ProfileTab' })}
          style={uiStyle(styles.backButton)}
        >
          <ArrowLeft size={22} color={uiColor("#292C30")} />
        </Pressable>
        <Text accessibilityRole="header" style={uiTextStyle(styles.headerTitle)}>{uiText("Cài đặt và thông báo")}</Text>
        <View style={uiStyle(styles.backButton)} />
      </View>
      <ScrollView contentContainerStyle={uiStyle(styles.content)} keyboardShouldPersistTaps="handled">
        <View style={uiStyle(styles.sectionHeading)}>
          <View style={uiStyle(styles.iconBadge)}><Languages size={21} color={uiColor("#00B8CE")} /></View>
          <View style={uiStyle(styles.flex)}><Text style={uiTextStyle(styles.sectionTitle)}>{uiText("Ngôn ngữ")}</Text><Text style={uiTextStyle(styles.muted)}>{uiText("Ngôn ngữ hiển thị trong ứng dụng")}</Text></View>
        </View>
        <View style={uiStyle(styles.card)}>
          <View style={uiStyle(styles.preferenceOptions)}>
            {([{ key: 'vi', label: 'Tiếng Việt' }, { key: 'en', label: 'Tiếng Anh' }] as const).map(option => <Pressable
              key={option.key} accessibilityRole="radio" accessibilityLabel={uiText(option.label)}
              accessibilityState={{ checked: appearance.language === option.key }}
              aria-checked={appearance.language === option.key}
              onPress={() => preferences.setLanguage(option.key)} style={uiStyle([styles.preferenceChoice, appearance.language === option.key && styles.preferenceSelected])}>
              <Text style={uiTextStyle([styles.choiceLabel, appearance.language === option.key && styles.choiceSelectedLabel])}>{uiText(option.label)}</Text>
              {appearance.language === option.key && <Check size={17} color={uiColor("#008A9A")} />}
            </Pressable>)}
          </View>
        </View>
        <View style={uiStyle(styles.sectionHeading)}>
          <View style={uiStyle(styles.iconBadge)}>{appearance.isDark ? <Moon size={21} color={uiColor("#00B8CE")} /> : <Sun size={21} color={uiColor("#00B8CE")} />}</View>
          <View style={uiStyle(styles.flex)}><Text style={uiTextStyle(styles.sectionTitle)}>{uiText("Giao diện")}</Text><Text style={uiTextStyle(styles.muted)}>{uiText("Chọn giao diện phù hợp với bạn.")}</Text></View>
        </View>
        <View style={uiStyle(styles.card)}>
          <View style={uiStyle(styles.preferenceOptions)}>
            {([{ key: 'light', label: 'Sáng', icon: Sun }, { key: 'dark', label: 'Tối', icon: Moon }, { key: 'system', label: 'Theo thiết bị', icon: Monitor }] as const).map(option => <Pressable
              key={option.key} accessibilityRole="radio" accessibilityLabel={uiText(option.label)}
              accessibilityState={{ checked: appearance.themeMode === option.key }}
              aria-checked={appearance.themeMode === option.key}
              onPress={() => preferences.setThemeMode(option.key)} style={uiStyle([styles.themeChoice, appearance.themeMode === option.key && styles.preferenceSelected])}>
              <option.icon size={23} color={uiColor(appearance.themeMode === option.key ? '#008A9A' : '#82949D')} />
              <Text style={uiTextStyle([styles.themeLabel, appearance.themeMode === option.key && styles.choiceSelectedLabel])}>{uiText(option.label)}</Text>
            </Pressable>)}
          </View>
          <Text style={uiTextStyle(styles.preferenceNote)}>{appearance.themeMode === 'system' ? uiText('Tự động theo cài đặt thiết bị') : uiText('Lựa chọn được lưu trên thiết bị này.')}</Text>
        </View>
        {appearance.error && <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>{uiText("Chưa lưu được lựa chọn. Bạn vẫn có thể sử dụng và thử chọn lại.")}</Text>}
        <View style={uiStyle(styles.sectionHeading)}>
          <View style={uiStyle(styles.iconBadge)}><Lock size={21} color={uiColor("#00B8CE")} /></View>
          <View style={uiStyle(styles.flex)}>
            <Text style={uiTextStyle(styles.sectionTitle)}>{uiText("Bảo mật tài khoản")}</Text>
            <Text style={uiTextStyle(styles.muted)}>{uiText(user?.email || 'Đăng nhập để quản lý mật khẩu.')}</Text>
          </View>
        </View>
        <View style={uiStyle(styles.card)}>
          {isLoading ? <ActivityIndicator color={uiColor("#00B8CE")} /> : user ? (
            <>
              <Text style={uiTextStyle(styles.cardTitle)}>{uiText("Đổi mật khẩu")}</Text>
              {PASSWORD_FIELDS.map(({ key, label }) => (
                <View key={key} style={uiStyle(styles.field)}>
                  <Text style={uiTextStyle(styles.label)}>{uiText(label)}</Text>
                  <TextInput
                    accessibilityLabel={uiText(label)}
                    value={passwords[key]}
                    onChangeText={(value) => {
                      setPasswords((current) => ({ ...current, [key]: value }));
                      setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
                      setSuccess(false);
                    }}
                    editable={!saving} secureTextEntry={!showPasswords}
                    autoCapitalize="none" autoCorrect={false}
                    autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                    textContentType={key === 'current' ? 'password' : 'newPassword'}
                    placeholder={uiText(label)} placeholderTextColor={uiColor("#9CA3AF")}
                    style={uiStyle([styles.input, !!errors[key] && styles.invalidInput])}
                    onSubmitEditing={key === 'confirm' ? savePassword : undefined}
                  />
                  {!!errors[key] && <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>{uiText(errors[key])}</Text>}
                </View>
              ))}
              <Pressable accessibilityRole="button" accessibilityLabel={showPasswords ? uiText('Ẩn mật khẩu') : uiText('Hiện mật khẩu')} onPress={() => setShowPasswords(!showPasswords)} style={uiStyle(styles.visibilityButton)}>
                {showPasswords ? <EyeOff size={18} color={uiColor("#6B7280")} /> : <Eye size={18} color={uiColor("#6B7280")} />}
                <Text style={uiTextStyle(styles.muted)}>{showPasswords ? uiText('Ẩn mật khẩu') : uiText('Hiện mật khẩu')}</Text>
              </Pressable>
              {!!errors.form && <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>{uiText(errors.form)}</Text>}
              {success && <View accessibilityLiveRegion="polite" style={uiStyle(styles.successRow)}><CheckCircle2 size={18} color={uiColor("#15803D")} /><Text style={uiTextStyle(styles.success)}>{uiText("Đã cập nhật mật khẩu.")}</Text></View>}
              <Pressable accessibilityRole="button" accessibilityLabel={uiText("Cập nhật mật khẩu")} disabled={saving} onPress={savePassword} style={uiStyle([styles.primaryButton, saving && styles.disabled])}>
                {saving && <ActivityIndicator color={uiColor("#FFFFFF")} size="small" />}
                <Text style={uiTextStyle(styles.primaryLabel)}>{saving ? uiText('Đang cập nhật...') : uiText('Cập nhật mật khẩu')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={uiTextStyle(styles.cardTitle)}>{uiText("Bảo vệ tài khoản của bạn")}</Text>
              <Text style={uiTextStyle(styles.description)}>{uiText("Đăng nhập để đổi mật khẩu tài khoản.")}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={uiText("Đăng nhập để quản lý cài đặt")} onPress={() => navigation.navigate('Login')} style={uiStyle(styles.primaryButton)}><Text style={uiTextStyle(styles.primaryLabel)}>{uiText("Đăng nhập")}</Text></Pressable>
            </>
          )}
        </View>

        <View style={uiStyle(styles.sectionHeading)}>
          <View style={uiStyle(styles.iconBadge)}><Bell size={21} color={uiColor("#00B8CE")} /></View>
          <Text style={uiTextStyle(styles.sectionTitle)}>{uiText("Thông báo")}</Text>
        </View>
        <View style={uiStyle(styles.card)}>
          <View style={uiStyle(styles.statusRow)}>
            <Text style={uiTextStyle(styles.cardTitle)}>{Platform.OS === 'web' ? uiText('Thông báo trình duyệt') : uiText('Thông báo thiết bị')}</Text>
            {Platform.OS === 'web' && <Text style={uiTextStyle(styles.status)}>{uiText(permissionLabel)}</Text>}
          </View>
          <Text style={uiTextStyle(styles.description)}>{uiText("Xem cập nhật đặt phòng, thanh toán và hoàn tiền trong hộp thông báo của ứng dụng. Quyền thông báo trình duyệt hoặc thiết bị được quản lý bên dưới.")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={uiText("Mở hộp thông báo")} onPress={() => navigation.navigate('Notifications')} style={uiStyle(styles.outlineButton)}><Text style={uiTextStyle(styles.outlineLabel)}>{uiText("Xem thông báo của tôi")}</Text></Pressable>
          {Platform.OS === 'web' && permission === 'unsupported' && <Text style={uiTextStyle(styles.muted)}>{uiText("Trình duyệt này không hỗ trợ thông báo.")}</Text>}
          {Platform.OS === 'web' && permission === 'denied' && <Text style={uiTextStyle(styles.muted)}>{uiText("Cho phép thông báo trong cài đặt trang web của trình duyệt rồi quay lại đây.")}</Text>}
          {(Platform.OS !== 'web' || permission === 'default') && (
            <Pressable accessibilityRole="button" accessibilityLabel={Platform.OS === 'web' ? uiText('Bật thông báo trình duyệt') : uiText('Mở cài đặt thiết bị')} disabled={notificationBusy} onPress={enableNotifications} style={uiStyle(styles.outlineButton)}>
              <Text style={uiTextStyle(styles.outlineLabel)}>{notificationBusy ? uiText('Đang mở...') : Platform.OS === 'web' ? uiText('Bật thông báo trình duyệt') : uiText('Mở cài đặt thiết bị')}</Text>
            </Pressable>
          )}
          {Platform.OS === 'web' && permission === 'granted' && <Pressable accessibilityRole="button" accessibilityLabel={uiText("Gửi thông báo thử nghiệm")} onPress={testNotification} style={uiStyle(styles.outlineButton)}><Text style={uiTextStyle(styles.outlineLabel)}>{uiText("Gửi thông báo thử nghiệm")}</Text></Pressable>}
          {!!notificationMessage && <Text accessibilityLiveRegion="polite" style={uiTextStyle(styles.success)}>{uiText(notificationMessage)}</Text>}
          {!!notificationError && <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>{uiText(notificationError)}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFB' },
  preferenceOptions: { flexDirection: 'row', gap: 10 },
  preferenceChoice: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#E0E8EC', borderRadius: 12, padding: 10, backgroundColor: '#F9FBFC' },
  preferenceSelected: { borderColor: '#00AFC2', backgroundColor: '#E6F9FB' },
  choiceLabel: { fontSize: 14, fontWeight: '600', color: '#607983' }, choiceSelectedLabel: { color: '#008A9A' },
  themeChoice: { flex: 1, minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1, borderColor: '#E0E8EC', borderRadius: 12, padding: 8, backgroundColor: '#F9FBFC' },
  themeLabel: { fontSize: 11, fontWeight: '600', color: '#607983', textAlign: 'center' },
  preferenceNote: { fontSize: 12, lineHeight: 18, color: '#82949D', marginTop: 12 },
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#292C30' },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 20, paddingBottom: 40 },
  flex: { flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 14 },
  iconBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#DFF9FC', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#292C30' },
  muted: { fontSize: 13, lineHeight: 20, color: '#6B7280' },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#292C30' },
  field: { marginTop: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, backgroundColor: '#F9FAFB', fontSize: 15, color: '#292C30' },
  invalidInput: { borderColor: '#DC2626' },
  visibilityButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, marginTop: 6 },
  primaryButton: { minHeight: 48, borderRadius: 10, backgroundColor: '#00B8CE', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 16 },
  primaryLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  description: { fontSize: 14, lineHeight: 22, color: '#6B7280', marginTop: 12, marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  status: { fontSize: 12, color: '#007F90', backgroundColor: '#E0F9FC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  outlineButton: { minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: '#00B8CE', alignItems: 'center', justifyContent: 'center', marginTop: 6, marginBottom: 8 },
  outlineLabel: { fontSize: 14, fontWeight: '600', color: '#008D9F' },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  success: { fontSize: 14, lineHeight: 22, color: '#15803D' },
  error: { fontSize: 13, lineHeight: 20, color: '#DC2626', marginTop: 6 },
});
