/**
 * Cross-platform storage wrapper.
 * - Web (Platform.OS === 'web'): uses localStorage (synchronous, wrapped in async API)
 * - iOS / Android: uses expo-secure-store (encrypted on-device storage)
 *
 * Always import THIS module instead of expo-secure-store directly.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createSecureChunks } from './secureChunks';
const nativeStorage = createSecureChunks(SecureStore);

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
        throw new Error('Could not access browser sign-in storage. Please enable site storage.');
      }
    }
    return nativeStorage.getItem(key);
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
        throw new Error('Could not access browser sign-in storage. Please enable site storage.');
      }
      return;
    }
    await nativeStorage.setItem(key, value);
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
        throw new Error('Could not access browser sign-in storage. Please enable site storage.');
      }
      return;
    }
    await nativeStorage.removeItem(key);
  },
};
