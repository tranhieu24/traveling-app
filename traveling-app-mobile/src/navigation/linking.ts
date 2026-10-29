import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

export const linkingConfig: NonNullable<LinkingOptions<RootStackParamList>['config']> = {
  screens: {
    Splash: '',
    CreateAccount: 'create-account',
    Login: 'login',
    Register: 'register',
    Settings: 'settings',
    HelpCenter: 'help',
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
  },
};
