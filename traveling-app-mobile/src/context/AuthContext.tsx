import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { apiClient } from '../services/apiClient';
import { storage } from '../utils/storage';
import { User } from '../types';

const AUTH_TOKEN_KEY = 'traveling_auth_token';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// --- Supabase client with cross-platform session storage ---
const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl || 'https://your-project.supabase.co';
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use `storage` wrapper so Supabase session persists on both Web & native
    storage: {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: (key) => storage.removeItem(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// --- Provider ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (_currentToken?: string) => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data);
      }
    } catch (e) {
      console.warn('[AuthContext] Could not fetch user profile:', e);
      setUser(null);
    }
  };

  // Restore session on app launch
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const savedToken = await storage.getItem(AUTH_TOKEN_KEY);
        if (savedToken) {
          setToken(savedToken);
          await fetchProfile(savedToken);
        }
      } catch (e) {
        console.error('[AuthContext] Failed to restore session token:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        const sessionToken = data.session.access_token;
        await storage.setItem(AUTH_TOKEN_KEY, sessionToken);
        setToken(sessionToken);
        await fetchProfile(sessionToken);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (data.session) {
        const sessionToken = data.session.access_token;
        await storage.setItem(AUTH_TOKEN_KEY, sessionToken);
        setToken(sessionToken);
        await fetchProfile(sessionToken);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      await storage.removeItem(AUTH_TOKEN_KEY);
      setToken(null);
      setUser(null);
    } catch (e) {
      console.warn('[AuthContext] Sign out error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
