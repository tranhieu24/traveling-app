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
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else if (!profile)
        setMessage('Sign-in cancelled. You can try again or continue with email.');
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : 'Unable to sign in. Please try again.');
    } finally {
      pending.current = false;
      setProvider(null);
    }
  };
  return (
    <View style={styles.group}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Apple sign-in coming soon"
        accessibilityState={{ disabled: true }}
        disabled
        style={[styles.button, { borderColor: '#BFC1C5', opacity: 0.55 }]}
      >
        <FontAwesome name="apple" size={21} color="#292C30" />
        <Text style={[styles.text, { color: '#292C30' }]}>Apple - Coming soon</Text>
      </Pressable>
      {providers.map((item) => (
        <Pressable
          cssInterop={false}
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={
            provider === item.id ? `Connecting to ${item.name}` : `Continue with ${item.name}`
          }
          accessibilityState={{ disabled: busy, busy: provider === item.id }}
          disabled={busy}
          onPress={() => void start(item.id)}
          style={({ pressed }) => [
            styles.button,
            { borderColor: item.color },
            (pressed || busy) && { opacity: 0.65 },
          ]}
        >
          {provider === item.id ? (
            <ActivityIndicator size="small" color={item.color} />
          ) : (
            <FontAwesome name={item.icon} size={21} color={item.color} />
          )}
          <Text style={[styles.text, { color: item.color }]}>
            {provider === item.id ? `Connecting to ${item.name}...` : `Continue with ${item.name}`}
          </Text>
        </Pressable>
      ))}
      {!!message && (
        <Text
          accessibilityRole={failed ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          style={[styles.message, failed && { color: '#C93D48' }]}
        >
          {message}
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
