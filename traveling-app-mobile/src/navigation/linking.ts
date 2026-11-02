import { getStateFromPath, type LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { AUTH_SCHEME, AUTH_CALLBACK_PATH, captureAuthCallback, isAuthCallback } from '../config/auth';
import { isSocialAuthInProgress } from '../services/socialAuth';
import type { RootStackParamList } from '../types';

export const linkingConfig: NonNullable<LinkingOptions<RootStackParamList>['config']> = {
  screens: {
    Splash: '',
    AuthCallback: AUTH_CALLBACK_PATH,
    CreateAccount: 'create-account',
    Login: 'login',
    AdminLogin: 'admin/login',
    AdminPortal: 'admin',
    Register: 'register',
    SearchSheet: 'search',
    FilterSheet: 'filters',
    PaymentsPayouts: 'account/payments',
    Settings: 'settings',
    HelpCenter: 'help',
    BookingSuccess: 'payments/:bookingId/success',
    Payment: 'bookings/:bookingId/pay',
    BookingDetail: 'bookings/:bookingId',
    MainTabs: {
      path: 'browse',
      initialRouteName: 'SearchTab',
      screens: {
        SearchTab: 'SearchTab',
        FavoritesTab: 'FavoritesTab',
        BookingsTab: 'BookingsTab',
        InboxTab: 'InboxTab',
        ProfileTab: 'ProfileTab',
      },
    },
    ListingDetail: 'stays/:listingId',
    AllReviews: 'stays/:listingId/reviews',
    WriteReview: 'stays/:listingId/review',
  },
};

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), `${AUTH_SCHEME}://`, 'traveling://'],
  config: linkingConfig,
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url && isAuthCallback(url)) captureAuthCallback(url);
    return url;
  },
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isAuthCallback(url)) {
        // openAuthSessionAsync owns a live native flow. Let its caller reset
        // navigation exactly once after the backend profile succeeds.
        if (isSocialAuthInProgress()) return;
        captureAuthCallback(url);
      }
      listener(url);
    });
    return () => subscription.remove();
  },
  getStateFromPath(path, options) {
    // Never put authorization codes or tokens into navigation state/logs.
    const cleanPath = path.replace(/^\//, '').split(/[?#]/)[0];
    return getStateFromPath(cleanPath === AUTH_CALLBACK_PATH ? AUTH_CALLBACK_PATH : path, options);
  },
};
