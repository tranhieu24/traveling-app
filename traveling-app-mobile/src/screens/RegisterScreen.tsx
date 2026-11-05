import { useUiPreferences, uiStyle, uiColor, uiTextStyle, uiText } from '../preferences/ui';
import { finishAuthNavigation } from '../navigation/authReturn';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

const FIELDS = [
  { key: 'fullName', label: "Họ và tên", placeholder: "Nhập họ và tên", icon: User, autoComplete: 'name', textContentType: 'name' },
  { key: 'email', label: "Địa chỉ email", placeholder: "Nhập địa chỉ email", icon: Mail, autoComplete: 'email', textContentType: 'emailAddress' },
  { key: 'password', label: "Mật khẩu", placeholder: "Tạo mật khẩu", icon: Lock, autoComplete: 'new-password', textContentType: 'newPassword' },
] as const;

type FieldName = (typeof FIELDS)[number]['key'];
type FormErrors = Partial<Record<FieldName | 'form', string>>;

export const RegisterScreen: React.FC = () => {
  useUiPreferences();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp, isLoading } = useAuth();
  const fieldRefs = {
    fullName: useRef<React.ComponentRef<typeof TextInput>>(null),
    email: useRef<React.ComponentRef<typeof TextInput>>(null),
    password: useRef<React.ComponentRef<typeof TextInput>>(null),
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
    if (!values.fullName.trim()) nextErrors.fullName = 'Vui lòng nhập họ và tên.';
    if (!values.email.trim()) nextErrors.email = 'Vui lòng nhập địa chỉ email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
    }
    if (values.password.length < 6) nextErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
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
        finishAuthNavigation(navigation);
      }
    } catch (error: unknown) {
      setErrors({ form: error instanceof Error ? error.message : 'Không thể tạo tài khoản. Vui lòng thử lại.' });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (confirmationEmail) {
    return (
      <SafeAreaView style={uiStyle(styles.screen)}>
        <ScrollView contentContainerStyle={uiStyle(styles.confirmationContent)}>
          <View style={uiStyle(styles.emailBadge)}><Mail size={30} color={uiColor("#00B8CE")} /></View>
          <Text accessibilityRole="header" style={uiTextStyle(styles.confirmationTitle)}>{uiText("Kiểm tra email của bạn")}</Text>
          <Text style={uiTextStyle(styles.confirmationMessage)}>{uiText("Hãy mở hộp thư ")}{uiText(confirmationEmail)}{uiText(" và nhấn liên kết xác nhận. Sau đó quay lại để đăng nhập.")}</Text>
          <Pressable
            cssInterop={false}
            accessibilityRole="button"
            onPress={() => navigation.replace('Login')}
            style={uiStyle(({ pressed }) => [styles.primaryButton, pressed && styles.pressed])}
          >
            <Text style={uiTextStyle(styles.primaryText)}>{uiText("Quay lại đăng nhập")}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={uiStyle(styles.screen)}>
      <KeyboardAvoidingView style={uiStyle(styles.screen)} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={uiStyle(styles.content)} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={uiStyle(styles.header)}>
            <Pressable
              cssInterop={false}
              accessibilityRole="button"
              accessibilityLabel={uiText("Quay lại")}
              disabled={busy}
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('CreateAccount')}
              style={uiStyle(({ pressed }) => [styles.backButton, pressed && styles.pressed])}
            >
              <ArrowLeft size={23} color={uiColor("#292C30")} />
            </Pressable>
            <Text accessibilityRole="header" style={uiTextStyle(styles.title)}>{uiText("Tiếp tục với email")}</Text>
          </View>

          <View style={uiStyle(styles.form)}>
            <View style={uiStyle(styles.emailBadge)}><Mail size={28} color={uiColor("#00B8CE")} /></View>
            <Text style={uiTextStyle(styles.heading)}>{uiText("Tạo tài khoản")}</Text>
            <Text style={uiTextStyle(styles.subtitle)}>{uiText("Điền một vài thông tin để bắt đầu hành trình tiếp theo.")}</Text>

            {FIELDS.map((field, index) => {
              const Icon = field.icon;
              const isPassword = field.key === 'password';
              return (
                <View key={field.key} style={uiStyle(styles.field)}>
                  <Text style={uiTextStyle(styles.label)}>{uiText(field.label)}</Text>
                  <View style={uiStyle([
                    styles.inputContainer,
                    focusedField === field.key && styles.focusedInput,
                    !!errors[field.key] && styles.invalidInput,
                  ])}>
                    <Icon size={19} color={uiColor("#93979F")} />
                    <TextInput
                      ref={fieldRefs[field.key]}
                      accessibilityLabel={uiText(field.label)}
                      value={values[field.key]}
                      onChangeText={(value) => {
                        setValues((current) => ({ ...current, [field.key]: value }));
                        setErrors((current) => ({ ...current, [field.key]: undefined, form: undefined }));
                      }}
                      onFocus={() => setFocusedField(field.key)}
                      onBlur={() => setFocusedField(null)}
                      placeholder={uiText(field.placeholder)}
                      placeholderTextColor={uiColor("#BFC2C8")}
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
                      style={uiStyle(styles.input)}
                    />
                    {isPassword && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? uiText('Ẩn mật khẩu') : uiText('Hiện mật khẩu')}
                        disabled={busy}
                        onPress={() => setShowPassword((current) => !current)}
                        style={uiStyle(styles.passwordToggle)}
                      >
                        {showPassword ? <EyeOff size={20} color={uiColor("#797C81")} /> : <Eye size={20} color={uiColor("#797C81")} />}
                      </Pressable>
                    )}
                  </View>
                  {!!errors[field.key] && <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>{uiText(errors[field.key])}</Text>}
                  {isPassword && !errors.password && <Text style={uiTextStyle(styles.hint)}>{uiText("Sử dụng ít nhất 6 ký tự.")}</Text>}
                </View>
              );
            })}

            {!!errors.form && (
              <View style={uiStyle(styles.errorBanner)}>
                <Text accessibilityRole="alert" style={uiTextStyle(styles.formError)}>{uiText(errors.form)}</Text>
              </View>
            )}
            <Pressable
              cssInterop={false}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={handleRegister}
              style={uiStyle(({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed])}
            >
              {busy && <ActivityIndicator size="small" color={uiColor("#FFFFFF")} />}
              <Text style={uiTextStyle(styles.primaryText)}>{busy ? uiText('Đang tạo tài khoản...') : uiText('Tạo tài khoản')}</Text>
            </Pressable>
          </View>

          <View style={uiStyle(styles.footer)}>
            <Text style={uiTextStyle(styles.footerText)}>{uiText("Đã có tài khoản?")}</Text>
            <Pressable accessibilityRole="link" hitSlop={8} disabled={busy} onPress={() => navigation.navigate('Login')}>
              <Text style={uiTextStyle(styles.loginLink)}>{uiText("Đăng nhập")}</Text>
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
