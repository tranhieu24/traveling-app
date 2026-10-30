import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

const FIELDS = [
  { key: 'fullName', label: 'Full name', placeholder: 'Enter your full name', icon: User, autoComplete: 'name', textContentType: 'name' },
  { key: 'email', label: 'Email address', placeholder: 'Enter your email address', icon: Mail, autoComplete: 'email', textContentType: 'emailAddress' },
  { key: 'password', label: 'Password', placeholder: 'Create a password', icon: Lock, autoComplete: 'new-password', textContentType: 'newPassword' },
] as const;

type FieldName = (typeof FIELDS)[number]['key'];
type FormErrors = Partial<Record<FieldName | 'form', string>>;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp, isLoading } = useAuth();
  const fieldRefs = {
    fullName: useRef<TextInputInstance>(null),
    email: useRef<TextInputInstance>(null),
    password: useRef<TextInputInstance>(null),
  };
  const submittingRef = useRef(false);
  const [values, setValues] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const busy = isLoading || isSubmitting;

  const handleRegister = async () => {
    if (busy || submittingRef.current) return;

    const nextErrors: FormErrors = {};
    if (!values.fullName.trim()) nextErrors.fullName = 'Please enter your full name.';
    if (!values.email.trim()) nextErrors.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (values.password.length < 6) nextErrors.password = 'Use at least 6 characters for your password.';
    setErrors(nextErrors);

    const invalidField = FIELDS.find((field) => nextErrors[field.key]);
    if (invalidField) {
      fieldRefs[invalidField.key].current?.focus();
      return;
    }

    Keyboard.dismiss();
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await signUp(values.email.trim(), values.password, values.fullName.trim());
      if (result.requiresEmailConfirmation) {
        setConfirmationEmail(values.email.trim());
        setValues((current) => ({ ...current, password: '' }));
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
    } catch (error: unknown) {
      setErrors({ form: error instanceof Error ? error.message : 'Unable to create your account. Please try again.' });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (confirmationEmail) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.confirmationContent}>
          <View style={styles.emailBadge}><Mail size={30} color="#00B8CE" /></View>
          <Text accessibilityRole="header" style={styles.confirmationTitle}>Check your email</Text>
          <Text style={styles.confirmationMessage}>Check the inbox for {confirmationEmail} for a confirmation link. Confirm your email, then come back to log in.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.replace('Login')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Back to log in</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            <Text accessibilityRole="header" style={styles.title}>Continue with email</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.emailBadge}><Mail size={28} color="#00B8CE" /></View>
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subtitle}>A few details, and your next adventure begins.</Text>

            {FIELDS.map((field, index) => {
              const Icon = field.icon;
              const isPassword = field.key === 'password';
              return (
                <View key={field.key} style={styles.field}>
                  <Text style={styles.label}>{field.label}</Text>
                  <View style={[
                    styles.inputContainer,
                    focusedField === field.key && styles.focusedInput,
                    !!errors[field.key] && styles.invalidInput,
                  ]}>
                    <Icon size={19} color="#93979F" />
                    <TextInput
                      ref={fieldRefs[field.key]}
                      accessibilityLabel={field.label}
                      value={values[field.key]}
                      onChangeText={(value) => {
                        setValues((current) => ({ ...current, [field.key]: value }));
                        setErrors((current) => ({ ...current, [field.key]: undefined, form: undefined }));
                      }}
                      onFocus={() => setFocusedField(field.key)}
                      onBlur={() => setFocusedField(null)}
                      placeholder={field.placeholder}
                      placeholderTextColor="#BFC2C8"
                      keyboardType={field.key === 'email' ? 'email-address' : 'default'}
                      autoCapitalize={field.key === 'fullName' ? 'words' : 'none'}
                      autoCorrect={false}
                      autoComplete={field.autoComplete}
                      textContentType={field.textContentType}
                      secureTextEntry={isPassword && !showPassword}
                      returnKeyType={isPassword ? 'go' : 'next'}
                      blurOnSubmit={isPassword}
                      onSubmitEditing={() => {
                        if (isPassword) void handleRegister();
                        else fieldRefs[FIELDS[index + 1].key].current?.focus();
                      }}
                      editable={!busy}
                      style={styles.input}
                    />
                    {isPassword && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        disabled={busy}
                        onPress={() => setShowPassword((current) => !current)}
                        style={styles.passwordToggle}
                      >
                        {showPassword ? <EyeOff size={20} color="#797C81" /> : <Eye size={20} color="#797C81" />}
                      </Pressable>
                    )}
                  </View>
                  {!!errors[field.key] && <Text accessibilityRole="alert" style={styles.error}>{errors[field.key]}</Text>}
                  {isPassword && !errors.password && <Text style={styles.hint}>Use at least 6 characters.</Text>}
                </View>
              );
            })}

            {!!errors.form && (
              <View style={styles.errorBanner}>
                <Text accessibilityRole="alert" style={styles.formError}>{errors.form}</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={handleRegister}
              style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed]}
            >
              {busy && <ActivityIndicator size="small" color="#FFFFFF" />}
              <Text style={styles.primaryText}>{busy ? 'Creating account...' : 'Create account'}</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable accessibilityRole="link" hitSlop={8} disabled={busy} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 32, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  title: { flex: 1, color: '#232629', fontSize: 21, fontWeight: '700', lineHeight: 28 },
  form: { marginTop: 28 },
  emailBadge: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#E4F8FA', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  heading: { color: '#232629', fontSize: 24, fontWeight: '600', lineHeight: 32 },
  subtitle: { color: '#797C81', fontSize: 15, lineHeight: 23, marginTop: 8, marginBottom: 10 },
  field: { marginTop: 18 },
  label: { color: '#45484D', fontSize: 16, lineHeight: 23, marginBottom: 10 },
  inputContainer: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#BFC1C5', borderRadius: 4, paddingHorizontal: 14 },
  focusedInput: { borderColor: '#00B8CE' },
  invalidInput: { borderColor: '#D94B55' },
  input: { flex: 1, minWidth: 0, height: 50, paddingVertical: 0, paddingHorizontal: 0, color: '#292C30', fontSize: 16 },
  passwordToggle: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  error: { color: '#C93D48', fontSize: 13, lineHeight: 19, marginTop: 8 },
  hint: { color: '#93979F', fontSize: 13, lineHeight: 19, marginTop: 8 },
  errorBanner: { backgroundColor: '#FFF2F3', padding: 12, borderRadius: 4, marginTop: 16 },
  formError: { color: '#C93D48', fontSize: 14, lineHeight: 21 },
  primaryButton: { minHeight: 52, backgroundColor: '#00B8CE', borderRadius: 3, marginTop: 20, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', lineHeight: 24 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 'auto', paddingTop: 40 },
  footerText: { fontSize: 18, lineHeight: 25, color: '#45484D' },
  loginLink: { color: '#399CD5', fontSize: 18, lineHeight: 25, textDecorationLine: 'underline' },
  pressed: { opacity: 0.65 },
  confirmationContent: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  confirmationTitle: { color: '#232629', fontSize: 26, lineHeight: 34, fontWeight: '700' },
  confirmationMessage: { color: '#797C81', fontSize: 16, lineHeight: 25, marginTop: 16 },
});
