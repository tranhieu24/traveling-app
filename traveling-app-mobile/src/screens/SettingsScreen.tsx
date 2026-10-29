import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Bell, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';

type PasswordField = 'current' | 'next' | 'confirm';
type BrowserPermission = NotificationPermission | 'unsupported';
const PASSWORD_FIELDS: { key: PasswordField; label: string }[] = [
  { key: 'current', label: 'Current password' },
  { key: 'next', label: 'New password' },
  { key: 'confirm', label: 'Confirm new password' },
];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isLoading, changePassword } = useAuth();
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
    if (!passwords.current) nextErrors.current = 'Enter your current password.';
    if (passwords.next.length < 6) nextErrors.next = 'Use at least 6 characters.';
    else if (passwords.next === passwords.current) nextErrors.next = 'Choose a different password.';
    if (passwords.confirm !== passwords.next || !passwords.confirm) nextErrors.confirm = 'Passwords do not match.';
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
      setErrors({ form: error instanceof Error ? error.message : 'Could not update your password. Please try again.' });
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
        if (result === 'granted') setNotificationMessage('Browser notifications enabled.');
        else if (result === 'denied') setNotificationError('Notifications are blocked. You can allow them in your browser site settings.');
      }
    } catch {
      setNotificationError('Could not open notification settings. Please try again.');
    } finally {
      setNotificationBusy(false);
    }
  };

  const testNotification = () => {
    setNotificationMessage('');
    setNotificationError('');
    try {
      if (Platform.OS !== 'web' || !('Notification' in window) || window.Notification.permission !== 'granted') return;
      new window.Notification('Traveling', { body: 'Notifications are enabled for this browser.' });
      setNotificationMessage('Test notification sent.');
    } catch {
      setNotificationError('This browser could not show a notification. Check your device notification settings.');
    }
  };

  const permissionLabel = permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : permission === 'default' ? 'Not enabled' : 'Unavailable';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button" accessibilityLabel="Back to profile"
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('MainTabs', { screen: 'ProfileTab' })}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#292C30" />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Settings & Notifications</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.sectionHeading}>
          <View style={styles.iconBadge}><Lock size={21} color="#00B8CE" /></View>
          <View style={styles.flex}>
            <Text style={styles.sectionTitle}>Account security</Text>
            <Text style={styles.muted}>{user?.email || 'Log in to manage your password.'}</Text>
          </View>
        </View>
        <View style={styles.card}>
          {isLoading ? <ActivityIndicator color="#00B8CE" /> : user ? (
            <>
              <Text style={styles.cardTitle}>Change password</Text>
              {PASSWORD_FIELDS.map(({ key, label }) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    accessibilityLabel={label}
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
                    placeholder={label} placeholderTextColor="#9CA3AF"
                    style={[styles.input, !!errors[key] && styles.invalidInput]}
                    onSubmitEditing={key === 'confirm' ? savePassword : undefined}
                  />
                  {!!errors[key] && <Text accessibilityRole="alert" style={styles.error}>{errors[key]}</Text>}
                </View>
              ))}
              <Pressable accessibilityRole="button" accessibilityLabel={showPasswords ? 'Hide passwords' : 'Show passwords'} onPress={() => setShowPasswords(!showPasswords)} style={styles.visibilityButton}>
                {showPasswords ? <EyeOff size={18} color="#6B7280" /> : <Eye size={18} color="#6B7280" />}
                <Text style={styles.muted}>{showPasswords ? 'Hide passwords' : 'Show passwords'}</Text>
              </Pressable>
              {!!errors.form && <Text accessibilityRole="alert" style={styles.error}>{errors.form}</Text>}
              {success && <View accessibilityLiveRegion="polite" style={styles.successRow}><CheckCircle2 size={18} color="#15803D" /><Text style={styles.success}>Password updated successfully.</Text></View>}
              <Pressable accessibilityRole="button" accessibilityLabel="Update password" disabled={saving} onPress={savePassword} style={[styles.primaryButton, saving && styles.disabled]}>
                {saving && <ActivityIndicator color="#FFFFFF" size="small" />}
                <Text style={styles.primaryLabel}>{saving ? 'Updating...' : 'Update password'}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Keep your account secure</Text>
              <Text style={styles.description}>Log in to change your account password.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Log in to manage settings" onPress={() => navigation.navigate('Login')} style={styles.primaryButton}><Text style={styles.primaryLabel}>Log in</Text></Pressable>
            </>
          )}
        </View>

        <View style={styles.sectionHeading}>
          <View style={styles.iconBadge}><Bell size={21} color="#00B8CE" /></View>
          <Text style={styles.sectionTitle}>Notifications</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.cardTitle}>{Platform.OS === 'web' ? 'Browser notifications' : 'Device notifications'}</Text>
            {Platform.OS === 'web' && <Text style={styles.status}>{permissionLabel}</Text>}
          </View>
          <Text style={styles.description}>{Platform.OS === 'web' ? 'Enable and test notifications in this browser. Automatic booking alerts are not enabled yet.' : 'Manage notification permissions in your device settings. Automatic booking alerts are not enabled yet.'}</Text>
          {Platform.OS === 'web' && permission === 'unsupported' && <Text style={styles.muted}>Notifications are not supported in this browser.</Text>}
          {Platform.OS === 'web' && permission === 'denied' && <Text style={styles.muted}>Allow notifications in your browser site settings, then return here.</Text>}
          {(Platform.OS !== 'web' || permission === 'default') && (
            <Pressable accessibilityRole="button" accessibilityLabel={Platform.OS === 'web' ? 'Enable browser notifications' : 'Open device settings'} disabled={notificationBusy} onPress={enableNotifications} style={styles.outlineButton}>
              <Text style={styles.outlineLabel}>{notificationBusy ? 'Opening...' : Platform.OS === 'web' ? 'Enable browser notifications' : 'Open device settings'}</Text>
            </Pressable>
          )}
          {Platform.OS === 'web' && permission === 'granted' && <Pressable accessibilityRole="button" accessibilityLabel="Send test notification" onPress={testNotification} style={styles.outlineButton}><Text style={styles.outlineLabel}>Send test notification</Text></Pressable>}
          {!!notificationMessage && <Text accessibilityLiveRegion="polite" style={styles.success}>{notificationMessage}</Text>}
          {!!notificationError && <Text accessibilityRole="alert" style={styles.error}>{notificationError}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFB' },
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
