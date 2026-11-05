import './global.css';
import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { linking } from './src/navigation/linking';
import { PreferencesProvider } from './src/preferences/PreferencesProvider';
import { useUiPreferences } from './src/preferences/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ApplicationNavigation />
        </AuthProvider>
      </QueryClientProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}

function ApplicationNavigation() {
  const { isDark } = useUiPreferences();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = { ...base, colors: { ...base.colors, primary: '#00BCD4',
    background: isDark ? '#111F29' : '#FFFFFF', card: isDark ? '#172630' : '#FFFFFF',
    text: isDark ? '#EDF3F7' : '#233944', border: isDark ? '#304451' : '#E5E8EB' } };
  return <NavigationContainer linking={linking} theme={navigationTheme}>
    <StatusBar style={isDark ? 'light' : 'dark'} />
    <AppNavigator />
  </NavigationContainer>;
}
