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
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ChevronDown, Check, Mail, X } from 'lucide-react-native';
import { RootStackParamList } from '../types';

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', minLength: 10, maxLength: 10 },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dialCode: '+84', minLength: 9, maxLength: 10 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', minLength: 10, maxLength: 11 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61', minLength: 9, maxLength: 10 },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65', minLength: 8, maxLength: 8 },
] as const;

const SOCIAL_PROVIDERS = [
  { name: 'Apple', icon: 'apple', color: '#292C30' },
  { name: 'Facebook', icon: 'facebook-official', color: '#399CD5' },
  { name: 'Google', icon: 'google', color: '#D94B55' },
] as const;

type Notice = { title: string; message: string; offerEmail?: boolean };

export const CreateAccountScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const handleContinue = () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < country.minLength || digits.length > country.maxLength) {
      setPhoneError(`Enter a valid mobile number for ${country.name}.`);
      return;
    }

    Keyboard.dismiss();
    setPhoneError('');
    setNotice({
      title: 'Sign up with your phone',
      message: 'Phone verification is not available yet. You can create your account with email instead.',
      offerEmail: true,
    });
  };

  const showLegalNotice = (title: string) => {
    setNotice({ title, message: `The ${title} for this app have not been published yet.` });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text accessibilityRole="header" style={styles.title}>Create an account</Text>

          <View style={styles.form}>
            <Text style={styles.label} nativeID="mobile-number-label">Enter your mobile number:</Text>
            <View style={styles.phoneRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Country code: ${country.name}, ${country.dialCode}`}
                accessibilityHint="Choose your country"
                onPress={() => {
                  Keyboard.dismiss();
                  setCountryPickerVisible(true);
                }}
                style={({ pressed }) => [styles.countryButton, pressed && styles.pressed]}
              >
                <Text style={styles.flag}>{country.flag}</Text>
                <ChevronDown size={19} color="#292C30" strokeWidth={2.2} />
              </Pressable>
              <TextInput
                accessibilityLabel={`Mobile number, country code ${country.dialCode}`}
                value={phone}
                onChangeText={(value) => {
                  setPhone(value.replace(/[^\d\s()-]/g, ''));
                  setPhoneError('');
                }}
                placeholder={`${country.dialCode} Mobile number`}
                placeholderTextColor="#BFC2C8"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel-national"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                style={[styles.phoneInput, !!phoneError && styles.invalidInput]}
              />
            </View>
            {!!phoneError && <Text accessibilityRole="alert" style={styles.error}>{phoneError}</Text>}

            <Pressable
              accessibilityRole="button"
              onPress={handleContinue}
              style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
            >
              <Text style={styles.continueText}>Continue</Text>
            </Pressable>

            <Text style={styles.separator}>or</Text>

            <View style={styles.socialButtons}>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('Register')}
                style={({ pressed }) => [styles.socialButton, styles.emailButton, pressed && styles.pressed]}
              >
                <Mail size={21} color="#292C30" />
                <Text style={[styles.socialText, styles.emailText]}>Continue with email</Text>
              </Pressable>
              {SOCIAL_PROVIDERS.map((provider) => (
                <Pressable
                  key={provider.name}
                  accessibilityRole="button"
                  accessibilityLabel={`Continue with ${provider.name}`}
                  onPress={() => setNotice({
                    title: `Continue with ${provider.name}`,
                    message: `${provider.name} sign-in is not available yet. You can create your account with email instead.`,
                    offerEmail: true,
                  })}
                  style={({ pressed }) => [
                    styles.socialButton,
                    { borderColor: provider.color },
                    pressed && styles.pressed,
                  ]}
                >
                  <FontAwesome name={provider.icon} size={21} color={provider.color} />
                  <Text style={[styles.socialText, { color: provider.color }]}>
                    Continue with {provider.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.legal}>
              <Text style={styles.legalText}>By signing up, you agree to our</Text>
              <Text style={styles.legalText}>
                <Text accessibilityRole="link" onPress={() => showLegalNotice('Terms of Service')} style={styles.legalLink}>
                  Terms of Service
                </Text>
                {' and '}
                <Text accessibilityRole="link" onPress={() => showLegalNotice('Privacy Policy')} style={styles.legalLink}>
                  Privacy Policy.
                </Text>
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already had an account?</Text>
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLink}>Log in</Text>
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
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close country picker" accessibilityRole="button" onPress={() => setCountryPickerVisible(false)} />
          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} accessibilityRole="header">Select your country</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => setCountryPickerVisible(false)}>
                <X size={22} color="#292C30" />
              </Pressable>
            </View>
            <ScrollView>
              {COUNTRIES.map((item) => (
                <Pressable
                  key={item.code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: country.code === item.code }}
                  accessibilityLabel={`${item.name}, ${item.dialCode}`}
                  onPress={() => {
                    setCountry(item);
                    setPhoneError('');
                    setCountryPickerVisible(false);
                  }}
                  style={({ pressed }) => [styles.countryOption, pressed && styles.pressed]}
                >
                  <Text style={styles.optionFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.dialCode}>{item.dialCode}</Text>
                  {country.code === item.code && <Check size={19} color="#00B8CE" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!notice} transparent animationType="fade" onRequestClose={() => setNotice(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <Text style={styles.modalTitle} accessibilityRole="header">{notice?.title}</Text>
            <Text style={styles.noticeMessage}>{notice?.message}</Text>
            {notice?.offerEmail && (
              <Pressable
                accessibilityRole="button"
                style={styles.continueButton}
                onPress={() => {
                  setNotice(null);
                  navigation.navigate('Register');
                }}
              >
                <Text style={styles.continueText}>Continue with email</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={() => setNotice(null)} style={styles.dismissButton}>
              <Text style={styles.dismissText}>Close</Text>
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
