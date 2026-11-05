import { useUiPreferences, uiStyle, uiColor, uiTextStyle, uiText } from '../preferences/ui';
import { finishAuthNavigation } from '../navigation/authReturn';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { getCapturedAuthCallback, safeAuthError } from '../config/auth';
import type { RootStackParamList, User } from '../types';

export function AuthCallbackScreen() {
  useUiPreferences();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { completeSocialSignIn } = useAuth();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const urlRef = useRef<string | null>(null);
  const completeRef = useRef(completeSocialSignIn);
  completeRef.current = completeSocialSignIn;
  const navigated = useRef(false);
  const completion = useRef<Promise<User> | null>(null);

  useEffect(() => {
    let alive = true;
    const finish = async () => {
      try {
        if (!urlRef.current)
          urlRef.current =
            Platform.OS === 'web'
              ? getCapturedAuthCallback() || window.location.href
              : getCapturedAuthCallback() || (await Linking.getInitialURL());
        if (!urlRef.current) throw new Error('Thiếu liên kết xác thực trả về.');
        // Strip credentials from browser history before any profile/API request.
        if (Platform.OS === 'web') window.history.replaceState({}, '', window.location.pathname);
        if (!completion.current) completion.current = completeRef.current(urlRef.current);
        const profile = await completion.current;
        if (alive && !navigated.current) {
          navigated.current = true;
          finishAuthNavigation(navigation, profile.role);
        }
      } catch (e) {
        if (alive) setError(safeAuthError(e).message);
      }
    };
    void finish();
    return () => {
      alive = false;
    };
  }, [attempt, navigation]);

  return (
    <SafeAreaView style={uiStyle(styles.page)}>
      <View style={uiStyle(styles.card)}>
        {!error && <ActivityIndicator color={uiColor("#00B8CE")} size="large" />}
        <Text accessibilityRole="header" style={uiTextStyle(styles.title)}>
          {error ? uiText('Chưa hoàn tất đăng nhập') : uiText('Đang hoàn tất đăng nhập...')}
        </Text>
        <Text accessibilityRole={error ? 'alert' : undefined} style={uiTextStyle(styles.message)}>
          {uiText(error || 'Đang xác minh tài khoản. Vui lòng chờ.')}
        </Text>
        {!!error && (
          <>
            <Pressable
              accessibilityRole="button"
              style={uiStyle(styles.primary)}
              onPress={() => {
                completion.current = null;
                setError('');
                setAttempt((n) => n + 1);
              }}
            >
              <Text style={uiTextStyle(styles.white)}>{uiText("Thử lại")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={uiStyle(styles.secondary)}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
            >
              <Text style={uiTextStyle(undefined)}>{uiText("Quay lại đăng nhập")}</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#292C30',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 23,
    color: '#646970',
    textAlign: 'center',
  },
  primary: {
    backgroundColor: '#00B8CE',
    padding: 16,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  white: { color: '#FFF', fontWeight: '600' },
  secondary: { padding: 16 },
});
