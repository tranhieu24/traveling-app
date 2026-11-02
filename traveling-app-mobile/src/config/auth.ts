import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const AUTH_TOKEN_KEY = 'traveling_auth_token';
export const AUTH_CALLBACK_PATH = 'auth/callback';
const configuredScheme = Constants.expoConfig?.scheme;
export const AUTH_SCHEME = Array.isArray(configuredScheme)
  ? configuredScheme[0]
  : configuredScheme || 'travelingapp';
export const NATIVE_AUTH_REDIRECT_URI = `${AUTH_SCHEME}://${AUTH_CALLBACK_PATH}`;

export function getAuthRedirectUri(): string {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') throw new Error('Open the app in a browser to sign in.');
    return `${window.location.origin}/${AUTH_CALLBACK_PATH}`;
  }
  if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') {
    throw new Error(
      'Google and Facebook sign-in require an installed app build. Please use a development build instead of Expo Go.'
    );
  }
  return NATIVE_AUTH_REDIRECT_URI;
}

export function isAuthCallback(url: string): boolean {
  try {
    const actual = new URL(url);
    const native = new URL(NATIVE_AUTH_REDIRECT_URI);
    if (actual.protocol === native.protocol)
      return actual.host === native.host && actual.pathname === native.pathname;
    return (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      actual.origin === window.location.origin &&
      actual.pathname === `/${AUTH_CALLBACK_PATH}`
    );
  } catch {
    return false;
  }
}

export function safeAuthError(error: unknown): Error {
  if (error instanceof FriendlyAuthError) return error;
  const code = (error as { code?: string })?.code;
  if (code === 'invalid_credentials')
    return new FriendlyAuthError('Email or password is incorrect.');
  if (code === 'email_not_confirmed')
    return new FriendlyAuthError('Please confirm your email before logging in.');
  if (code === 'user_already_exists')
    return new FriendlyAuthError('An account with this email already exists. Please log in.');
  if (code === 'weak_password') return new FriendlyAuthError('Please choose a stronger password.');
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit')
    return new FriendlyAuthError('Too many attempts. Please wait a moment and try again.');
  return new FriendlyAuthError(
    'Unable to sign in. Please check your connection or try signing in with email.'
  );
}
export class FriendlyAuthError extends Error {}

let callbackUrl: string | null = null;
export function captureAuthCallback(url: string) {
  callbackUrl = url;
}
export function getCapturedAuthCallback() {
  return callbackUrl;
}
