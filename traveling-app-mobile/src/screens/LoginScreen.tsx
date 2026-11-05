import { useUiPreferences, uiStyle, uiText, uiColor, uiTextStyle } from '../preferences/ui';
import { clearAuthReturn, finishAuthNavigation } from '../navigation/authReturn';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SocialSignInButtons } from '../components/common/SocialSignInButtons';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  useUiPreferences();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, isLoading } = useAuth();
  const emailRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const submittingRef = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = isLoading || isSubmitting;

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (['GO_BACK', 'POP', 'POP_TO_TOP'].includes(event.data.action.type)) clearAuthReturn();
  }), [navigation]);

  const handleLogin = async () => {
    if (busy || submittingRef.current) return;

    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'Vui lòng nhập địa chỉ email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
    }
    if (!password) nextErrors.password = 'Vui lòng nhập mật khẩu.';
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
      const profile = await signIn(email.trim(), password);
      finishAuthNavigation(navigation, profile.role);
    } catch (error: unknown) {
      setErrors({
        form: error instanceof Error ? error.message : 'Không thể đăng nhập. Vui lòng thử lại.',
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={uiStyle(styles.screen)}>
      <KeyboardAvoidingView
        style={uiStyle(styles.screen)}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={uiStyle(styles.scroll)}
          contentContainerStyle={uiStyle(styles.content)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={uiStyle(styles.header)}>
            <Pressable
              cssInterop={false}
              accessibilityRole="button"
              accessibilityLabel={uiText("Go back")}
              disabled={busy}
              onPress={() =>
                navigation.canGoBack() ? navigation.goBack() : navigation.replace('MainTabs')
              }
              style={uiStyle(({ pressed }) => [styles.backButton, pressed && styles.pressed])}
            >
              <ArrowLeft size={23} color={uiColor("#292C30")} />
            </Pressable>
            <Text accessibilityRole="header" style={uiTextStyle(styles.title)}>{uiText("Đăng nhập")}</Text>
          </View>

          <View style={uiStyle(styles.form)}>
            <Text style={uiTextStyle(styles.welcome)}>{uiText("Chào mừng bạn trở lại!")}</Text>
            <Text style={uiTextStyle(styles.subtitle)}>{uiText("Đăng nhập để tiếp tục lên kế hoạch cho chuyến đi.")}</Text>

            <View style={uiStyle(styles.field)}>
              <Text style={uiTextStyle(styles.label)}>{uiText("Địa chỉ email")}</Text>
              <View
                style={uiStyle([
                  styles.inputContainer,
                  focusedField === 'email' && styles.focusedInput,
                  !!errors.email && styles.invalidInput,
                ])}
              >
                <Mail size={19} color={uiColor("#93979F")} />
                <TextInput
                  ref={emailRef}
                  accessibilityLabel={uiText("Địa chỉ email")}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setErrors((current) => ({ ...current, email: undefined, form: undefined }));
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={uiText("Nhập địa chỉ email")}
                  placeholderTextColor={uiColor("#BFC2C8")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!busy}
                  style={uiStyle(styles.input)}
                />
              </View>
              {!!errors.email && (
                <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>
                  {uiText(errors.email)}
                </Text>
              )}
            </View>

            <View style={uiStyle(styles.field)}>
              <Text style={uiTextStyle(styles.label)}>{uiText("Mật khẩu")}</Text>
              <View
                style={uiStyle([
                  styles.inputContainer,
                  focusedField === 'password' && styles.focusedInput,
                  !!errors.password && styles.invalidInput,
                ])}
              >
                <Lock size={19} color={uiColor("#93979F")} />
                <TextInput
                  ref={passwordRef}
                  accessibilityLabel={uiText("Mật khẩu")}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setErrors((current) => ({ ...current, password: undefined, form: undefined }));
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={uiText("Nhập mật khẩu")}
                  placeholderTextColor={uiColor("#BFC2C8")}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  editable={!busy}
                  style={uiStyle(styles.input)}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? uiText('Ẩn mật khẩu') : uiText('Hiện mật khẩu')}
                  accessibilityState={{ checked: showPassword }}
                  disabled={busy}
                  onPress={() => setShowPassword((value) => !value)}
                  style={uiStyle(styles.passwordToggle)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={uiColor("#797C81")} />
                  ) : (
                    <Eye size={20} color={uiColor("#797C81")} />
                  )}
                </Pressable>
              </View>
              {!!errors.password && (
                <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>
                  {uiText(errors.password)}
                </Text>
              )}
            </View>

            <Pressable accessibilityRole="button" disabled={busy} onPress={()=>navigation.navigate('ForgotPassword')} style={uiStyle({minHeight:44,justifyContent:'center',alignItems:'flex-end'})}><Text style={uiTextStyle({color:'#008A9A'})}>{uiText("Quên mật khẩu?")}</Text></Pressable>
            {!!errors.form && (
              <View style={uiStyle(styles.errorBanner)}>
                <Text accessibilityRole="alert" style={uiTextStyle(styles.formError)}>
                  {uiText(errors.form)}
                </Text>
              </View>
            )}

            <Pressable

              cssInterop={false}
              accessibilityRole="button"
              accessibilityLabel={isSubmitting ? uiText('Đang đăng nhập') : uiText('Đăng nhập')}
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={handleLogin}
              style={uiStyle(({ pressed }) => [styles.loginButton, (pressed || busy) && styles.pressed])}
            >
              {isSubmitting && <ActivityIndicator size="small" color={uiColor("#FFFFFF")} />}
              <Text style={uiTextStyle(styles.loginText)}>{isSubmitting ? uiText("Đang đăng nhập...") : uiText("Đăng nhập")}</Text>
            </Pressable>

            <View style={uiStyle(styles.separator)}>
              <View style={uiStyle(styles.separatorLine)} />
              <Text style={uiTextStyle(styles.separatorText)}>{uiText("hoặc tiếp tục với")}</Text>
              <View style={uiStyle(styles.separatorLine)} />
            </View>
            <SocialSignInButtons disabled={busy} />
          </View>

          <View style={uiStyle(styles.footer)}>
            <Text style={uiTextStyle(styles.footerText)}>{uiText("Chưa có tài khoản?")}</Text>
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              disabled={busy}
              onPress={() => navigation.navigate('CreateAccount')}
            >
              <Text style={uiTextStyle(styles.signupLink)}>{uiText("Đăng ký")}</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={uiText("Admin Portal")}
            disabled={busy}
            onPress={() => navigation.navigate('AdminLogin')}
            style={uiStyle(styles.adminLink)}
          >
            <Text style={uiTextStyle(styles.adminText)}>{uiText("Cổng quản trị")}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6F8F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#232629', fontSize: 18, fontWeight: '700', lineHeight: 26 },
  form: { marginTop: 28 },
  welcome: { color: '#172C35', fontSize: 28, fontWeight: '700', lineHeight: 36 },
  subtitle: { color: '#71808A', fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 8 },
  field: { marginTop: 18 },
  label: { color: '#34454F', fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 8 },
  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAFCFD',
    borderWidth: 1,
    borderColor: '#DCE3E7',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  focusedInput: { borderColor: '#00B8CE', backgroundColor: '#F1FCFD' },
  invalidInput: { borderColor: '#D94B55' },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 0,
    color: '#232F37',
    fontSize: 16,
  },
  passwordToggle: {
    width: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  error: { color: '#C93D48', fontSize: 13, lineHeight: 19, marginTop: 8 },
  errorBanner: { backgroundColor: '#FFF2F3', padding: 12, borderRadius: 12, marginTop: 16 },
  formError: { color: '#C93D48', fontSize: 14, lineHeight: 21 },
  loginButton: {
    minHeight: 54,
    backgroundColor: '#00B8CE',
    borderRadius: 12,
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  loginText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#E8EDF0' },
  separatorText: { color: '#7B8790', fontSize: 12, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 32,
  },
  footerText: { fontSize: 14, lineHeight: 22, color: '#71808A' },
  signupLink: { color: '#009BAE', fontSize: 14, fontWeight: '600', lineHeight: 22 },
  adminLink: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 12, marginTop: 4 },
  adminText: { fontSize: 12, lineHeight: 18, color: '#81909F' },
  pressed: { opacity: 0.65 },
});
