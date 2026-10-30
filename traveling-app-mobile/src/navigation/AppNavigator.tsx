import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AuthCallbackScreen } from '../screens/AuthCallbackScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { CreateAccountScreen } from '../screens/CreateAccountScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { AdminLoginScreen } from '../screens/AdminLoginScreen';
import { AdminPortalScreen } from '../screens/AdminPortalScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { TabNavigator } from './TabNavigator';
import { ListingDetailScreen } from '../screens/ListingDetailScreen';
import { SearchSheetScreen } from '../screens/SearchSheetScreen';
import { FilterSheetScreen } from '../screens/FilterSheetScreen';
import { SearchResultsScreen } from '../screens/SearchResultsScreen';
import { OrderReviewScreen } from '../screens/OrderReviewScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { BookingSuccessScreen } from '../screens/BookingSuccessScreen';
import { BookingDetailScreen } from '../screens/BookingDetailScreen';
import { AllReviewsScreen } from '../screens/AllReviewsScreen';
import { WriteReviewScreen } from '../screens/WriteReviewScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpCenterScreen } from '../screens/HelpCenterScreen';
import { PaymentsPayoutsScreen } from '../screens/PaymentsPayoutsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="AdminPortal" component={AdminPortalScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="PaymentsPayouts" component={PaymentsPayoutsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Stack.Screen
        name="SearchSheet"
        component={SearchSheetScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="FilterSheet"
        component={FilterSheetScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'transparentModal', contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="OrderReview" component={OrderReviewScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
    </Stack.Navigator>
  );
};
