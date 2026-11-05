import { Platform } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
export type AuthReturnTarget = {
  [Name in 'ListingDetail' | 'Payment' | 'WriteReview']: {
    name: Name;
    params: RootStackParamList[Name];
  };
}['ListingDetail' | 'Payment' | 'WriteReview'];

const KEY = 'traveling_auth_return';
const MAX_AGE = 30 * 60 * 1000;
let pending: { target: AuthReturnTarget; createdAt: number } | null = null;

function browserStorage() {
  try {
    return Platform.OS === 'web' && typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function validTarget(value: unknown): value is AuthReturnTarget {
  if (!value || typeof value !== 'object') return false;
  const route = value as { name?: string; params?: Record<string, unknown> };
  if (!route.params || typeof route.params !== 'object') return false;
  const id = route.name === 'Payment' ? route.params.bookingId : route.params.listingId;
  return (
    ['ListingDetail', 'Payment', 'WriteReview'].includes(route.name || '') &&
    typeof id === 'string' && /^[\w-]{1,200}$/.test(id)
  );
}

export function clearAuthReturn() {
  pending = null;
  try { browserStorage()?.removeItem(KEY); } catch { /* Memory still works without storage. */ }
}

export function requestLogin(navigation: Navigation, target: AuthReturnTarget) {
  pending = { target, createdAt: Date.now() };
  // Keep the destination across a web OAuth redirect; never store credentials here.
  try { browserStorage()?.setItem(KEY, JSON.stringify(pending)); } catch { /* Use memory. */ }
  navigation.navigate('Login');
}

export function finishAuthNavigation(navigation: Navigation, role?: string) {
  let saved = pending;
  try {
    const value = browserStorage()?.getItem(KEY);
    if (!saved && value) saved = JSON.parse(value);
  } catch { /* Ignore an unavailable or malformed saved destination. */ }
  clearAuthReturn();
  if (
    saved && validTarget(saved.target) && Number.isFinite(saved.createdAt) &&
    Date.now() >= saved.createdAt && Date.now() - saved.createdAt <= MAX_AGE
  ) {
    navigation.reset({
      index: 1,
      routes: [{ name: 'MainTabs', params: { screen: 'SearchTab' } }, saved.target],
    });
    return;
  }
  navigation.reset({ index: 0, routes: [{ name: role === 'admin' ? 'AdminPortal' : 'MainTabs' }] });
}
