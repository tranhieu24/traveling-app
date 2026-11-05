import { useUiPreferences, uiStyle, uiTextStyle, uiText, uiColor } from '../preferences/ui';
import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import { useAuth } from '../context/AuthContext';
import { ChevronDown, Check, Mail, X } from 'lucide-react-native';
import { RootStackParamList } from '../types';

const COUNTRIES = [
  { code: 'US', name: 'Hoa Kỳ', flag: '🇺🇸', dialCode: '+1', minLength: 10, maxLength: 10 },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dialCode: '+84', minLength: 9, maxLength: 10 },
  { code: 'GB', name: 'Vương quốc Anh', flag: '🇬🇧', dialCode: '+44', minLength: 10, maxLength: 11 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61', minLength: 9, maxLength: 10 },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65', minLength: 8, maxLength: 8 },
] as const;


type Notice = { title: string; message: string; offerEmail?: boolean };

export const CreateAccountScreen: React.FC = () => {
  useUiPreferences();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isLoading } = useAuth();
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const showLegalNotice = (title: string) => {
    setNotice({ title, message: `The ${title} for this app have not been published yet.` });
  };

  return (
    <SafeAreaView style={uiStyle(styles.screen)}>
      <KeyboardAvoidingView
        style={uiStyle(styles.screen)}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={uiStyle(styles.content)}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text accessibilityRole="header" style={uiTextStyle(styles.title)}>{uiText("Tạo tài khoản")}</Text>

          <View style={uiStyle(styles.form)}>
            <Text style={uiTextStyle(styles.label)} nativeID="mobile-number-label">{uiText("Số điện thoại của bạn:")}</Text>
            <View style={uiStyle(styles.phoneRow)}>
              <Pressable
                cssInterop={false}
                accessibilityRole="button"
                accessibilityLabel={uiText(`Country code: ${country.name}, ${country.dialCode}`)}
                accessibilityHint={uiText("Chọn quốc gia của bạn")}
                onPress={() => {
                  Keyboard.dismiss();
                  setCountryPickerVisible(true);
                }}
                style={uiStyle(({ pressed }) => [styles.countryButton, pressed && styles.pressed])}
              >
                <Text style={uiTextStyle(styles.flag)}>{uiText(country.flag)}</Text>
                <ChevronDown size={19} color={uiColor("#292C30")} strokeWidth={2.2} />
              </Pressable>
              <TextInput
                accessibilityLabel={uiText(`Mobile number, country code ${country.dialCode}`)}
                value={phone}
                onChangeText={(value) => {
                  setPhone(value.replace(/[^\d\s()-]/g, ''));
                  setPhoneError('');
                }}
                placeholder={uiText(`${country.dialCode} Mobile number`)}
                placeholderTextColor={uiColor("#BFC2C8")}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel-national"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="done"
                editable={false}
                style={uiStyle([styles.phoneInput, !!phoneError && styles.invalidInput])}
              />
            </View>
            {!!phoneError && <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>{uiText(phoneError)}</Text>}

            <Pressable

              cssInterop={false}
              accessibilityRole="button"
              disabled
              accessibilityState={{ disabled: true }}
              style={uiStyle(({ pressed }) => [styles.continueButton, { opacity: 0.5 }, pressed && styles.pressed])}
            >
              <Text style={uiTextStyle(styles.continueText)}>{uiText("Đăng ký qua điện thoại - Sắp ra mắt")}</Text>
            </Pressable>

            <Text style={uiTextStyle(styles.separator)}>{uiText("or")}</Text>

            <View style={uiStyle(styles.socialButtons)}>
              <Pressable
                cssInterop={false}
                accessibilityRole="button"
                disabled={isLoading}
                onPress={() => navigation.navigate('Register')}
                style={uiStyle(({ pressed }) => [styles.socialButton, styles.emailButton, pressed && styles.pressed])}
              >
                <Mail size={21} color={uiColor("#292C30")} />
                <Text style={uiTextStyle([styles.socialText, styles.emailText])}>{uiText("Tiếp tục với email")}</Text>
              </Pressable>
              <SocialSignInButtons />
            </View>

            <View style={uiStyle(styles.legal)}>
              <Text style={uiTextStyle(styles.legalText)}>{uiText("Khi đăng ký, bạn đồng ý với")}</Text>
              <Text style={uiTextStyle(styles.legalText)}>
                <Text accessibilityRole="link" onPress={() => showLegalNotice('Điều khoản dịch vụ')} style={uiTextStyle(styles.legalLink)}>{uiText("Điều khoản dịch vụ")}</Text>
                {uiText(' và ')}
                <Text accessibilityRole="link" onPress={() => showLegalNotice('Chính sách quyền riêng tư')} style={uiTextStyle(styles.legalLink)}>{uiText("Chính sách quyền riêng tư.")}</Text>
              </Text>
            </View>
          </View>

          <View style={uiStyle(styles.footer)}>
            <Text style={uiTextStyle(styles.footerText)}>{uiText("Đã có tài khoản?")}</Text>
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              disabled={isLoading}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={uiTextStyle(styles.loginLink)}>{uiText("Đăng nhập")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={countryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryPickerVisible(false)}
      >
        <View style={uiStyle(styles.modalOverlay)}>
          <Pressable style={uiStyle(StyleSheet.absoluteFill)} accessibilityLabel={uiText("Đóng danh sách quốc gia")} accessibilityRole="button" onPress={() => setCountryPickerVisible(false)} />
          <View style={uiStyle(styles.modalCard)} accessibilityViewIsModal>
            <View style={uiStyle(styles.modalHeader)}>
              <Text style={uiTextStyle(styles.modalTitle)} accessibilityRole="header">{uiText("Chọn quốc gia")}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={uiText("Đóng")} hitSlop={12} onPress={() => setCountryPickerVisible(false)}>
                <X size={22} color={uiColor("#292C30")} />
              </Pressable>
            </View>
            <ScrollView>
              {COUNTRIES.map((item) => (
                <Pressable
                  cssInterop={false}
                  key={item.code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: country.code === item.code }}
                  accessibilityLabel={uiText(`${item.name}, ${item.dialCode}`)}
                  onPress={() => {
                    setCountry(item);
                    setPhoneError('');
                    setCountryPickerVisible(false);
                  }}
                  style={uiStyle(({ pressed }) => [styles.countryOption, pressed && styles.pressed])}
                >
                  <Text style={uiTextStyle(styles.optionFlag)}>{uiText(item.flag)}</Text>
                  <Text style={uiTextStyle(styles.countryName)}>{uiText(item.name)}</Text>
                  <Text style={uiTextStyle(styles.dialCode)}>{uiText(item.dialCode)}</Text>
                  {country.code === item.code && <Check size={19} color={uiColor("#00B8CE")} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!notice} transparent animationType="fade" onRequestClose={() => setNotice(null)}>
        <View style={uiStyle(styles.modalOverlay)}>
          <View style={uiStyle(styles.modalCard)} accessibilityViewIsModal>
            <Text style={uiTextStyle(styles.modalTitle)} accessibilityRole="header">{uiText(notice?.title)}</Text>
            <Text style={uiTextStyle(styles.noticeMessage)}>{uiText(notice?.message)}</Text>
            {notice?.offerEmail && (
              <Pressable
                accessibilityRole="button"
                style={uiStyle(styles.continueButton)}
                onPress={() => {
                  setNotice(null);
                  navigation.navigate('Register');
                }}
              >
                <Text style={uiTextStyle(styles.continueText)}>{uiText("Tiếp tục với email")}</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={() => setNotice(null)} style={uiStyle(styles.dismissButton)}>
              <Text style={uiTextStyle(styles.dismissText)}>{uiText("Đóng")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 48, paddingBottom: 20 },
  title: { color: '#232629', fontSize: 21, fontWeight: '700', lineHeight: 28 },
  form: { marginTop: 52 },
  label: { color: '#45484D', fontSize: 18, lineHeight: 25, marginBottom: 10 },
  phoneRow: { flexDirection: 'row', gap: 16 },
  countryButton: {
    width: 103, height: 52, borderRadius: 3, backgroundColor: '#F3F4F5',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  flag: { fontSize: 29 },
  phoneInput: {
    flex: 1, minWidth: 0, height: 52, borderWidth: 1, borderColor: '#BFC1C5',
    borderRadius: 4, paddingHorizontal: 18, paddingVertical: 0, color: '#292C30', fontSize: 18,
  },
  invalidInput: { borderColor: '#D94B55' },
  error: { color: '#C93D48', fontSize: 13, lineHeight: 19, marginTop: 8 },
  continueButton: {
    minHeight: 52, backgroundColor: '#00B8CE', borderRadius: 3, marginTop: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12,
  },
  continueText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', lineHeight: 24 },
  separator: { color: '#797C81', fontSize: 14, lineHeight: 20, textAlign: 'center', marginVertical: 13 },
  socialButtons: { gap: 8 },
  emailButton: { borderColor: '#BFC1C5' },
  emailText: { color: '#292C30' },
  socialButton: {
    minHeight: 52, borderWidth: 1, borderRadius: 4, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12,
  },
  socialText: { fontSize: 18, lineHeight: 24, flexShrink: 1 },
  legal: { alignItems: 'center', marginTop: 23 },
  legalText: { color: '#93979F', fontSize: 12, lineHeight: 21, textAlign: 'center' },
  legalLink: { textDecorationLine: 'underline' },
  footer: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginTop: 'auto', paddingTop: 48,
  },
  footerText: { fontSize: 18, lineHeight: 25, color: '#45484D' },
  loginLink: { color: '#399CD5', fontSize: 18, lineHeight: 25, textDecorationLine: 'underline' },
  pressed: { opacity: 0.65 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)', alignItems: 'center',
    justifyContent: 'center', padding: 22,
  },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '80%', padding: 22, borderRadius: 14, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 20, lineHeight: 27, fontWeight: '600', color: '#232629', flexShrink: 1 },
  countryOption: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  optionFlag: { fontSize: 24 },
  countryName: { flex: 1, fontSize: 15, color: '#292C30' },
  dialCode: { color: '#797C81', fontSize: 15 },
  noticeMessage: { fontSize: 16, lineHeight: 24, color: '#646970', marginTop: 14 },
  dismissButton: { alignItems: 'center', padding: 12, marginTop: 8 },
  dismissText: { color: '#646970', fontSize: 16 },
});
