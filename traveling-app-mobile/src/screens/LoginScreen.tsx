import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

const SOCIAL_PROVIDERS = [
  { name: 'Apple', icon: 'apple', color: '#292C30' },
  { name: 'Facebook', icon: 'facebook-official', color: '#399CD5' },
  { name: 'Google', icon: 'google', color: '#D94B55' },
] as const;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, isLoading } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<string | null>(null);
  const busy = isLoading || isSubmitting;

  const handleLogin = async () => {
    if (busy || submittingRef.current) return;

    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!password) nextErrors.password = 'Please enter your password.';
    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password) {
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    Keyboard.dismiss();
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigation.replace('MainTabs');
    } catch (error: unknown) {
      setErrors({ form: error instanceof Error ? error.message : 'Unable to log in. Please try again.' });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              disabled={busy}
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('CreateAccount')}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <ArrowLeft size={23} color="#292C30" />
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>Log in</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.welcome}>Welcome back!</Text>
            <Text style={styles.subtitle}>Log in to continue your next adventure.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <View style={[styles.inputContainer, focusedField === 'email' && styles.focusedInput, !!errors.email && styles.invalidInput]}>
                <Mail size={19} color="#93979F" />
                <TextInput
                  ref={emailRef}
                  accessibilityLabel="Email address"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setErrors((current) => ({ ...current, email: undefined, form: undefined }));
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your email address"
                  placeholderTextColor="#BFC2C8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!busy}
                  style={styles.input}
                />
              </View>
              {!!errors.email && <Text accessibilityRole="alert" style={styles.error}>{errors.email}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputContainer, focusedField === 'password' && styles.focusedInput, !!errors.password && styles.invalidInput]}>
                <Lock size={19} color="#93979F" />
                <TextInput
                  ref={passwordRef}
                  accessibilityLabel="Password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setErrors((current) => ({ ...current, password: undefined, form: undefined }));
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  placeholderTextColor="#BFC2C8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  editable={!busy}
                  style={styles.input}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityState={{ checked: showPassword }}
                  disabled={busy}
                  onPress={() => setShowPassword((value) => !value)}
                  style={styles.passwordToggle}
                >
                  {showPassword ? <EyeOff size={20} color="#797C81" /> : <Eye size={20} color="#797C81" />}
                </Pressable>
              </View>
              {!!errors.password && <Text accessibilityRole="alert" style={styles.error}>{errors.password}</Text>}
            </View>

            {!!errors.form && (
              <View style={styles.errorBanner}>
                <Text accessibilityRole="alert" style={styles.formError}>{errors.form}</Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={busy ? 'Logging in' : 'Log in'}
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={handleLogin}
              style={({ pressed }) => [styles.loginButton, (pressed || busy) && styles.pressed]}
            >
              {busy && <ActivityIndicator size="small" color="#FFFFFF" />}
              <Text style={styles.loginText}>{busy ? 'Logging in...' : 'Log in'}</Text>
            </Pressable>

            <Text style={styles.separator}>or</Text>
            <View style={styles.socialButtons}>
              {SOCIAL_PROVIDERS.map((provider) => (
                <Pressable
                  key={provider.name}
                  accessibilityRole="button"
                  accessibilityLabel={`Continue with ${provider.name}`}
                  disabled={busy}
                  onPress={() => {
                    Keyboard.dismiss();
                    setSocialProvider(provider.name);
                  }}
                  style={({ pressed }) => [styles.socialButton, { borderColor: provider.color }, (pressed || busy) && styles.pressed]}
                >
                  <FontAwesome name={provider.icon} size={21} color={provider.color} />
                  <Text style={[styles.socialText, { color: provider.color }]}>Continue with {provider.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable accessibilityRole="link" hitSlop={8} disabled={busy} onPress={() => navigation.navigate('CreateAccount')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!socialProvider} transparent animationType="fade" onRequestClose={() => setSocialProvider(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={styles.modalTitle}>Continue with {socialProvider}</Text>
            <Text style={styles.noticeMessage}>
              {socialProvider} sign-in is not available yet. Please log in with your email and password.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSocialProvider(null);
                emailRef.current?.focus();
              }}
              style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
            >
              <Text style={styles.loginText}>Continue with email</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 32, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  title: { color: '#232629', fontSize: 21, fontWeight: '700', lineHeight: 28 },
  form: { marginTop: 36 },
  welcome: { color: '#232629', fontSize: 24, fontWeight: '600', lineHeight: 32 },
  subtitle: { color: '#797C81', fontSize: 15, lineHeight: 23, marginTop: 8, marginBottom: 10 },
  field: { marginTop: 18 },
  label: { color: '#45484D', fontSize: 16, lineHeight: 23, marginBottom: 10 },
  inputContainer: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#BFC1C5', borderRadius: 4, paddingHorizontal: 14,
  },
  focusedInput: { borderColor: '#00B8CE' },
  invalidInput: { borderColor: '#D94B55' },
  input: { flex: 1, minWidth: 0, height: 50, paddingVertical: 0, paddingHorizontal: 0, color: '#292C30', fontSize: 16 },
  passwordToggle: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  error: { color: '#C93D48', fontSize: 13, lineHeight: 19, marginTop: 8 },
  errorBanner: { backgroundColor: '#FFF2F3', padding: 12, borderRadius: 4, marginTop: 16 },
  formError: { color: '#C93D48', fontSize: 14, lineHeight: 21 },
  loginButton: {
    minHeight: 52, backgroundColor: '#00B8CE', borderRadius: 3, marginTop: 20,
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  loginText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', lineHeight: 24 },
  separator: { color: '#797C81', fontSize: 14, lineHeight: 20, textAlign: 'center', marginVertical: 13 },
  socialButtons: { gap: 8 },
  socialButton: {
    minHeight: 52, borderWidth: 1, borderRadius: 4, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12,
  },
  socialText: { fontSize: 18, lineHeight: 24, flexShrink: 1 },
  footer: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginTop: 'auto', paddingTop: 48,
  },
  footerText: { fontSize: 18, lineHeight: 25, color: '#45484D' },
  signupLink: { color: '#399CD5', fontSize: 18, lineHeight: 25, textDecorationLine: 'underline' },
  pressed: { opacity: 0.65 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { width: '100%', maxWidth: 420, padding: 22, borderRadius: 14, backgroundColor: '#FFFFFF' },
  modalTitle: { fontSize: 20, lineHeight: 27, fontWeight: '600', color: '#232629' },
  noticeMessage: { fontSize: 16, lineHeight: 24, color: '#646970', marginTop: 14 },
});
