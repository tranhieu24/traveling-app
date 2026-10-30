import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

export const linkingConfig: NonNullable<LinkingOptions<RootStackParamList>['config']> = {
  screens: {
    Splash: '',
    CreateAccount: 'create-account',
    Login: 'login',
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
