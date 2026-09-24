export interface AppSettings {
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  theme: 'dark' | 'light';
  reducedMotion: boolean;
  useVirtualKeypad: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  soundVolume: 0.7,
  theme: 'dark',
  reducedMotion: false,
  useVirtualKeypad: false,
};

const STORAGE_KEY = 'math_app_settings_v1';

type Listener = (settings: AppSettings) => void;

export class SettingsStore {
  private static cached: AppSettings | null = null;
  private static listeners: Set<Listener> = new Set();

  static get(): AppSettings {
    if (this.cached) return this.cached;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const loaded: AppSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
          this.cached = loaded;
          return loaded;
        }
      }
    } catch {
      // fallback to defaults if localStorage throws (e.g. strict privacy mode)
    }
    const defaults: AppSettings = { ...DEFAULT_SETTINGS };
    this.cached = defaults;
    return defaults;
  }

  static set(updates: Partial<AppSettings>): AppSettings {
    const current = this.get();
    const updated = { ...current, ...updates };
    this.cached = updated;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // ignore quota or security exceptions
    }
    this.notifyListeners(updated);
    return updated;
  }

  static subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(settings: AppSettings): void {
    for (const listener of this.listeners) {
      try {
        listener(settings);
      } catch (err) {
        console.error('Error in SettingsStore listener:', err);
      }
    }
  }

  /** Reset store state (used mainly in testing) */
  static reset(): void {
    this.cached = null;
    this.listeners.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }
}
