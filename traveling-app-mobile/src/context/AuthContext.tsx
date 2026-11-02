import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { supabase } from '../services/supabase';
import { createSessionBridge } from '../services/authSession';
import { createSocialAuth, SocialProvider } from '../services/socialAuth';
import { FriendlyAuthError, isAuthCallback, safeAuthError } from '../config/auth';
import { storage } from '../utils/storage';
import { User } from '../types';

export { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signInWithSocialProvider: (provider: SocialProvider) => Promise<User | null>;
  completeSocialSignIn: (url: string) => Promise<User>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const mounted = useRef(true);
  const operation = useRef(false);

  const fetchProfile = async (): Promise<User> => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data.success && res.data.data) return res.data.data as User;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const code = error.response?.data?.error?.code;
        if (code === 'PROFILE_NOT_FOUND')
          throw new FriendlyAuthError(
            'Your sign-in succeeded, but your account profile has not been created. Please contact support.'
          );
        if (code === 'ACCOUNT_BLOCKED')
          throw new FriendlyAuthError('This account is blocked. Please contact support.');
        if (error.response?.status === 401)
          throw new FriendlyAuthError('Your session expired. Please log in again.');
      }
    }
    throw new FriendlyAuthError(
      'Could not load your account profile. Check your connection and try again.'
    );
  };

  const bridgeRef = useRef<ReturnType<typeof createSessionBridge> | null>(null);
  if (!bridgeRef.current)
    bridgeRef.current = createSessionBridge({
      storage,
      fetchProfile,
      publish: (nextToken, nextUser) => {
        if (mounted.current) {
          setToken(nextToken);
          setUser(nextUser);
        }
      },
      clearCache: () => queryClient.clear(),
    });
  const bridge = bridgeRef.current;
  const socialRef = useRef<ReturnType<typeof createSocialAuth> | null>(null);
  if (!socialRef.current) socialRef.current = createSocialAuth(bridge.sync);
  const social = socialRef.current;

  async function run<T>(action: () => Promise<T>): Promise<T> {
    if (operation.current)
      throw new FriendlyAuthError('Sign-in is already in progress. Please wait.');
    operation.current = true;
    setIsLoading(true);
    setAuthError(null);
    try {
      return await action();
    } catch (error) {
      const friendly = safeAuthError(error);
      if (mounted.current) setAuthError(friendly.message);
      throw friendly;
    } finally {
      operation.current = false;
      if (mounted.current) setIsLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Remain synchronous and never call Supabase auth APIs from its event
      // callback. sync() queues storage immediately, so API requests wait for
      // the latest token before running; the login result shares the same work.
      if (event === 'INITIAL_SESSION' || !mounted.current) return;
      if (event === 'SIGNED_OUT') {
        void bridge.clear().catch(() => {
          if (mounted.current)
            setAuthError('Could not clear saved sign-in. Please retry logging out.');
        });
      } else if (session && ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
        void bridge.sync(session).catch((error) => {
          if (mounted.current) setAuthError(safeAuthError(error).message);
        });
      }
    });

    const bootstrap = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        // The callback screen owns code exchange and navigation.
        if (initialUrl && isAuthCallback(initialUrl)) return;
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted.current) return;
        if (data.session) await bridge.sync(data.session);
        else await bridge.clear();
      } catch (error) {
        if (mounted.current) setAuthError(safeAuthError(error).message);
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    };
    void bootstrap();
    const appState =
      Platform.OS !== 'web'
        ? AppState.addEventListener('change', (state) => {
            if (state === 'active') supabase.auth.startAutoRefresh();
            else supabase.auth.stopAutoRefresh();
          })
        : null;
    if (Platform.OS !== 'web' && AppState.currentState === 'active')
      supabase.auth.startAutoRefresh();

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      appState?.remove();
      if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
    };
  }, []);

  const signIn = (email: string, password: string) =>
    run(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.session) throw new FriendlyAuthError('Unable to create a sign-in session.');
      return bridge.sync(data.session);
    });

  const signUp = (email: string, password: string, fullName: string) =>
    run(async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (data.session) await bridge.sync(data.session);
      return { requiresEmailConfirmation: !data.session };
    });

  const signInWithSocialProvider = (provider: SocialProvider) => run(() => social.start(provider));
  const completeSocialSignIn = (url: string) => run(() => social.finish(url));

  const signOut = async () => {
    setIsLoading(true);
    // Invalidate pending profile results immediately, before remote revocation.
    try {
      await bridge.clear().catch(() => {
        setAuthError('Could not clear saved sign-in. Please retry logging out.');
      });
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error)
        setAuthError('Signed out locally. Remote session revocation could not be confirmed.');
      else setAuthError(null);
    } catch {
      setAuthError('Signed out locally. Remote session revocation could not be confirmed.');
    } finally {
      try {
        await bridge.clear();
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) throw new FriendlyAuthError('Please log in to change your password.');
    if (!currentPassword) throw new FriendlyAuthError('Enter your current password.');
    if (newPassword.length < 6)
      throw new FriendlyAuthError('Use at least 6 characters for your new password.');
    if (newPassword === currentPassword)
      throw new FriendlyAuthError('Choose a different password.');
    await run(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (error) throw error;
      if (!data.session || data.user?.id !== user.id) {
        await signOut();
        throw new FriendlyAuthError('Your session changed. Please log in again.');
      }
      await bridge.sync(data.session);
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
    });
  };

  const refreshProfile = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw safeAuthError(error);
    if (!data.session) {
      await bridge.clear();
      return;
    }
    await bridge.sync(data.session, true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        authError,
        signIn,
        signUp,
        signInWithSocialProvider,
        completeSocialSignIn,
        signOut,
        changePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
