import { useUiPreferences, uiStyle, uiText, uiColor, uiTextStyle } from '../../preferences/ui';
import { finishAuthNavigation } from '../../navigation/authReturn';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import type { SocialProvider } from '../../services/socialAuth';
import type { RootStackParamList } from '../../types';

const providers = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook-official',
    color: '#399CD5',
  },
  { id: 'google', name: 'Google', icon: 'google', color: '#D94B55' },
] as const;

export function SocialSignInButtons({ disabled = false }: { disabled?: boolean }) {
  useUiPreferences();
  const { signInWithSocialProvider, isLoading } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pending = useRef(false);
  const navigated = useRef(false);
  const [provider, setProvider] = useState<SocialProvider | null>(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const busy = disabled || isLoading || !!provider;
  const start = async (id: SocialProvider) => {
    if (busy || pending.current) return;
    pending.current = true;
    setProvider(id);
    setMessage('');
    setFailed(false);
    Keyboard.dismiss();
    try {
      const profile = await signInWithSocialProvider(id);
      if (profile && !navigated.current) {
        navigated.current = true;
        finishAuthNavigation(navigation, profile.role);
      } else if (!profile)
        setMessage('Bạn đã hủy đăng nhập. Có thể thử lại hoặc dùng email.');
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      pending.current = false;
      setProvider(null);
    }
  };
  return (
    <View style={uiStyle(styles.group)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uiText("Đăng nhập bằng Apple sắp ra mắt")}
        accessibilityState={{ disabled: true }}
        disabled
        style={uiStyle([styles.button, { borderColor: '#BFC1C5', opacity: 0.55 }])}
      >
        <FontAwesome name="apple" size={21} color={uiColor("#292C30")} />
        <Text style={uiTextStyle([styles.text, { color: '#292C30' }])}>{uiText("Apple - Sắp ra mắt")}</Text>
      </Pressable>
      {providers.map((item) => (
        <Pressable
          cssInterop={false}
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={provider === item.id ? uiText(`Đang kết nối ${item.name}`) : uiText(`Tiếp tục với ${item.name}`)}
          accessibilityState={{ disabled: busy, busy: provider === item.id }}
          disabled={busy}
          onPress={() => void start(item.id)}
          style={uiStyle(({ pressed }) => [
            styles.button,
            { borderColor: item.color },
            (pressed || busy) && { opacity: 0.65 },
          ])}
        >
          {provider === item.id ? (
            <ActivityIndicator size="small" color={uiColor(item.color)} />
          ) : (
            <FontAwesome name={item.icon} size={21} color={uiColor(item.color)} />
          )}
          <Text style={uiTextStyle([styles.text, { color: item.color }])}>
            {provider === item.id ? uiText(`Đang kết nối ${item.name}...`) : uiText(`Tiếp tục với ${item.name}`)}
          </Text>
        </Pressable>
      ))}
      {!!message && (
        <Text
          accessibilityRole={failed ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          style={uiTextStyle([styles.message, failed && { color: '#C93D48' }])}
        >
          {uiText(message)}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: 10 },
  button: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  text: { fontSize: 15, fontWeight: '500', lineHeight: 22, flexShrink: 1, textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 21, color: '#646970', marginTop: 6 },
});
