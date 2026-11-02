import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../types';
import { adminSession } from '../services/admin';
import { a, AdminButton, AdminNotice, colors } from '../components/admin/AdminUI';

export function AdminLoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const pending = useRef(false);
  const login = async () => {
    if (pending.current || isLoading) return;
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu quản trị.');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const profile = await signIn(email.trim(), password);
      if (profile.role !== 'admin') throw new Error('not-admin');
      await adminSession();
      navigation.reset({ index: 0, routes: [{ name: 'AdminPortal' }] });
    } catch {
      setError('Thông tin đăng nhập không hợp lệ hoặc bạn không có quyền truy cập.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.brand}>
            <View style={s.brandIcon}>
              <ShieldCheck size={27} color={colors.primary} />
            </View>
            <Text style={s.brandText}>
              traveling<Text style={{ color: colors.primary }}>.</Text>
            </Text>
            <Text style={s.tag}>ADMIN PORTAL</Text>
          </View>
          <View style={s.card}>
            <View style={s.lock}>
              <LockKeyhole size={26} color={colors.primary} />
            </View>
            <Text accessibilityRole="header" style={s.title}>
              Chào mừng trở lại
            </Text>
            <Text style={s.subtitle}>Đăng nhập để quản lý hệ thống Traveling.</Text>
            <View style={{ gap: 9 }}>
              <Text style={a.label}>Email quản trị</Text>
              <TextInput
                accessibilityLabel="Email quản trị"
                value={email}
                onChangeText={setEmail}
                placeholder="admin@example.com"
                placeholderTextColor="#A4B2BA"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={!busy && !isLoading}
                style={a.input}
              />
            </View>
            <View style={{ gap: 9 }}>
              <Text style={a.label}>Mật khẩu quản trị</Text>
              <View style={[a.input, a.row, { paddingVertical: 0 }]}>
                <TextInput
                  accessibilityLabel="Mật khẩu quản trị"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#A4B2BA"
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  onSubmitEditing={() => void login()}
                  editable={!busy && !isLoading}
                  style={{ minHeight: 43, flex: 1, color: colors.ink, fontSize: 13 }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={visible ? 'Ẩn mật khẩu quản trị' : 'Hiện mật khẩu quản trị'}
                  onPress={() => setVisible((current) => !current)}
                >
                  {visible ? (
                    <EyeOff size={18} color={colors.muted} />
                  ) : (
                    <Eye size={18} color={colors.muted} />
                  )}
                </Pressable>
              </View>
            </View>
            {!!error && <AdminNotice text={error} error />}
            <AdminButton
              title="Đăng nhập quản trị"
              onPress={() => void login()}
              busy={busy || isLoading}
              icon={<ArrowRight size={17} color="#FFF" />}
            />
            <Text style={s.note}>
              Chỉ tài khoản đã được cấp quyền quản trị mới có thể truy cập.
            </Text>
          </View>
          <AdminButton
            title="Quay về ứng dụng"
            variant="ghost"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
            icon={<ArrowLeft size={15} color={colors.muted} />}
            disabled={busy}
          />
          <Text style={s.footer}>Traveling · Quản lý hành trình, kết nối trải nghiệm.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F8FA' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 22 },
  brand: { alignItems: 'center', gap: 9, marginBottom: 8 },
  brandIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#DDF4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { fontSize: 28, color: colors.ink, fontWeight: '800', letterSpacing: -1 },
  tag: { fontSize: 9, letterSpacing: 3, color: colors.muted, fontWeight: '600' },
  card: {
    width: '100%',
    maxWidth: 430,
    padding: 30,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2EBEF',
    backgroundColor: '#FFF',
    gap: 20,
  },
  lock: {
    backgroundColor: colors.pale,
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '700', color: colors.ink },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: -10, marginBottom: 7 },
  note: { fontSize: 11, lineHeight: 18, textAlign: 'center', color: colors.muted },
  footer: { fontSize: 10, color: '#A1B0BA', textAlign: 'center' },
});
