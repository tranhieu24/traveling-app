import React, { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import { colorScheme } from 'nativewind';
import { preferences } from './store';
import { useUiPreferences } from './ui';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const state = useUiPreferences();
  useEffect(() => {
    void preferences.hydrate();
    const subscription = Appearance.addChangeListener(event => preferences.updateSystemTheme(event.colorScheme));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    colorScheme.set(Platform.OS === 'web' ? state.isDark ? 'dark' : 'light' : state.themeMode);
    if (state.themeMode === 'system') preferences.updateSystemTheme(Appearance.getColorScheme());
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = state.language;
      document.documentElement.style.colorScheme = state.isDark ? 'dark' : 'light';
    }
  }, [state.themeMode, state.isDark, state.language]);
  return <>{children}</>;
}
