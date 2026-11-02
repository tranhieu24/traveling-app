import './authCrypto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl;
const key =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey;
if (!url || !key) throw new Error('Missing public Supabase configuration.');
// Only a public publishable/anon key belongs in this client.
if (String(key).startsWith('sb_secret_')) throw new Error('A public Supabase key is required.');

export const supabase = createClient(url, key, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
