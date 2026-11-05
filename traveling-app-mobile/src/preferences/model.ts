export type Language = 'vi' | 'en';
export type ThemeMode = 'light' | 'dark' | 'system';
export interface UiPreferences {
  language: Language; themeMode: ThemeMode; isDark: boolean; hydrated: boolean; error: boolean;
}
export const PREFERENCES_KEY = 'traveling_ui_preferences_v1';
interface PreferenceStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }

export function createPreferenceStore(storage: PreferenceStorage, systemTheme: () => 'light' | 'dark') {
  let snapshot: UiPreferences = { language: 'vi', themeMode: 'system', isDark: systemTheme() === 'dark', hydrated: false, error: false };
  const listeners = new Set<() => void>();
  let languageRevision = 0, themeRevision = 0;
  let hydration: Promise<void> | null = null, writes = Promise.resolve();
  const emit = (patch: Partial<UiPreferences>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()); };
  const persist = () => {
    const data = JSON.stringify({ language: snapshot.language, themeMode: snapshot.themeMode });
    writes = writes.then(() => storage.setItem(PREFERENCES_KEY, data)).then(() => {
      if (snapshot.error) emit({ error: false });
    }).catch(() => emit({ error: true }));
    return writes;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    hydrate() {
      if (hydration) return hydration;
      hydration = (async () => {
        try {
          const raw = await storage.getItem(PREFERENCES_KEY);
          let saved: { language?: unknown; themeMode?: unknown } = {};
          try { saved = raw ? JSON.parse(raw) || {} : {}; } catch { /* Ignore corrupt preferences; never touch auth storage. */ }
          const language = !languageRevision && ['vi', 'en'].includes(saved.language as string) ? saved.language as Language : snapshot.language;
          const themeMode = !themeRevision && ['light', 'dark', 'system'].includes(saved.themeMode as string) ? saved.themeMode as ThemeMode : snapshot.themeMode;
          emit({ language, themeMode, isDark: (themeMode === 'system' ? systemTheme() : themeMode) === 'dark', hydrated: true });
        } catch { emit({ hydrated: true, error: true }); }
        if (languageRevision || themeRevision) await persist();
      })();
      return hydration;
    },
    setLanguage(language: Language) {
      if (!['vi', 'en'].includes(language)) return;
      languageRevision++; emit({ language });
      if (snapshot.hydrated) void persist();
    },
    setThemeMode(themeMode: ThemeMode) {
      if (!['light', 'dark', 'system'].includes(themeMode)) return;
      themeRevision++; emit({ themeMode, isDark: (themeMode === 'system' ? systemTheme() : themeMode) === 'dark' });
      if (snapshot.hydrated) void persist();
    },
    updateSystemTheme(value: string | null | undefined) {
      if (snapshot.themeMode === 'system' && (value === 'light' || value === 'dark') && snapshot.isDark !== (value === 'dark')) emit({ isDark: value === 'dark' });
    },
    flush: () => writes,
  };
}
