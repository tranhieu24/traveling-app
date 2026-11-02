import type { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { requireSecurePKCE } from './authCrypto';
import {
  FriendlyAuthError,
  getAuthRedirectUri,
  isAuthCallback,
  safeAuthError,
} from '../config/auth';
import type { User } from '../types';

export type SocialProvider = 'google' | 'facebook';
let active = false;
export const isSocialAuthInProgress = () => active;

export function createSocialAuth(
  sync: (session: Session) => Promise<User>,
  { startTimeoutMs = 15000 }: { startTimeoutMs?: number } = {}
) {
  async function prepare<T>(work: Promise<T>, provider: SocialProvider): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new FriendlyAuthError(
                  `Could not start ${provider === 'google' ? 'Google' : 'Facebook'} sign-in. Please refresh the page and try again.`
                )
              ),
            startTimeoutMs
          );
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
  // Cache only the last callback exchange. A profile retry reuses the session,
  // never attempts to spend a one-use authorization code twice.
  let lastUrl: string | null = null;
  let exchange: Promise<Session> | null = null;

  async function finish(url: string): Promise<User> {
    if (!isAuthCallback(url))
      throw new FriendlyAuthError('Invalid sign-in callback. Please start sign-in again.');
    if (lastUrl !== url || !exchange) {
      lastUrl = url;
      exchange = (async () => {
        const parsed = new URL(url);
        const params = new URLSearchParams(parsed.search);
        const fragment = new URLSearchParams(parsed.hash.slice(1));
        const providerError = params.get('error') || fragment.get('error');
        if (providerError === 'access_denied')
          throw new FriendlyAuthError(
            'Sign-in was cancelled. You can try again or continue with email.'
          );
        if (providerError || params.has('error_code') || fragment.has('error_code'))
          throw new FriendlyAuthError(
            'Google/Facebook could not complete sign-in. Please try again or continue with email.'
          );
        const code = params.get('code');
        let session: Session | null = null;
        if (code) {
          const flowId = params.get('sb_flow_id');
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            code,
            flowId ? { flowId } : undefined
          );
          if (error)
            throw new FriendlyAuthError(
              'This sign-in link is invalid or expired. Please start sign-in again.'
            );
          session = data.session;
        } else if (fragment.get('access_token') && fragment.get('refresh_token')) {
          const { data, error } = await supabase.auth.setSession({
            access_token: fragment.get('access_token')!,
            refresh_token: fragment.get('refresh_token')!,
          });
          if (error) throw safeAuthError(error);
          session = data.session;
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw safeAuthError(error);
          session = data.session;
        }
        if (!session)
          throw new FriendlyAuthError(
            'No sign-in session was received. Please start sign-in again.'
          );
        if (!session.user.email?.trim()) {
          await supabase.auth.signOut({ scope: 'local' });
          throw new FriendlyAuthError(
            'Your Google/Facebook account did not provide an email. Allow email access or continue with email.'
          );
        }
        return session;
      })();
    }
    return sync(await exchange);
  }
  async function start(provider: SocialProvider): Promise<User | null> {
    if (active) return null;
    active = true;
    // New attempt must not reuse an old callback.
    lastUrl = null;
    exchange = null;
    try {
      let redirectTo: string;
      try {
        redirectTo = getAuthRedirectUri();
        requireSecurePKCE();
      } catch (e) {
        throw new FriendlyAuthError(
          e instanceof Error ? e.message : 'Secure sign-in is unavailable.'
        );
      }
      const { data, error } = await prepare(
        supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            ...(provider === 'facebook' ? { scopes: 'email' } : {}),
          },
        }),
        provider
      );
      if (error) throw safeAuthError(error);
      if (!data.url) throw new FriendlyAuthError('Unable to open sign-in. Please try again.');
      // A full-page web redirect persists the verifier in Supabase storage;
      // the callback screen restores the session in the same browser.
      if (Platform.OS === 'web') {
        // Keep duplicate clicks locked, but never wait forever if navigation
        // is blocked or the provider page cannot be reached.
        const providerName = provider === 'google' ? 'Google' : 'Facebook';
        const authorizeUrl = data.url;
        return await new Promise<null>((resolve, reject) => {
          let leftPage = false;
          let timer: ReturnType<typeof setTimeout> | undefined;
          const cleanup = () => {
            if (timer !== undefined) clearTimeout(timer);
            window.removeEventListener('pagehide', leaving);
            window.removeEventListener('pageshow', resumed);
          };
          const leaving = () => {
            leftPage = true;
            if (timer !== undefined) clearTimeout(timer);
          };
          const resumed = (event: PageTransitionEvent) => {
            if (!leftPage && !event.persisted) return;
            cleanup();
            resolve(null);
          };
          window.addEventListener('pagehide', leaving);
          window.addEventListener('pageshow', resumed);
          timer = setTimeout(() => {
            cleanup();
            reject(
              new FriendlyAuthError(
                `Could not open ${providerName} sign-in. Check your connection, open the app directly in your browser and try again.`
              )
            );
          }, startTimeoutMs);
          try {
            window.location.assign(authorizeUrl);
          } catch {
            cleanup();
            reject(
              new FriendlyAuthError(`Could not open ${providerName} sign-in. Please try again.`)
            );
          }
        });
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'cancel' || result.type === 'dismiss') return null;
      if (result.type !== 'success')
        throw new FriendlyAuthError('Could not open sign-in. Please try again.');
      return await finish(result.url);
    } finally {
      active = false;
    }
  }
  return { start, finish };
}
