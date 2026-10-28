import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

export const linkingConfig: NonNullable<LinkingOptions<RootStackParamList>['config']> = {
  screens: {
    Splash: '',
    CreateAccount: 'create-account',
    Login: 'login',
    Register: 'register',
    MainTabs: 'browse',
    ListingDetail: 'stays/:listingId',
  },
};
