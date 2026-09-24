import { useState, useEffect, useCallback } from 'react';
import { SettingsStore } from '../../core/storage/settingsStore';

export type ThemeMode = 'dark' | 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = SettingsStore.get().theme;
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const applyTheme = useCallback((mode: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Synchronize <meta name="theme-color">
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', mode === 'dark' ? '#0f172a' : '#f8fafc');
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    SettingsStore.set({ theme: mode });
    applyTheme(mode);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Subscribe to SettingsStore changes
  useEffect(() => {
    return SettingsStore.subscribe((settings) => {
      if (settings.theme !== theme) {
        setThemeState(settings.theme);
        applyTheme(settings.theme);
      }
    });
  }, [theme, applyTheme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' };
}
