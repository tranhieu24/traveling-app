/**
 * Cross-platform storage wrapper.
 * - Web (Platform.OS === 'web'): uses localStorage (synchronous, wrapped in async API)
 * - iOS / Android: uses expo-secure-store (encrypted on-device storage)
 *
 * Always import THIS module instead of expo-secure-store directly.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const storage = {
  /**
   * Retrieve a value by key.
   * Returns null if not found or if running in a non-browser web environment (SSR).
   */
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return typeof window !== 'undefined'
          ? localStorage.getItem(key)
          : null;
      } catch (e) {
        console.warn('[storage.getItem] localStorage error:', e);
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  /**
   * Store a string value under the given key.
   */
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch (e) {
        console.warn('[storage.setItem] localStorage error:', e);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  /**
   * Delete the value stored under the given key.
   */
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.warn('[storage.removeItem] localStorage error:', e);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
