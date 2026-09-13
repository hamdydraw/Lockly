import { Capacitor, registerPlugin } from '@capacitor/core';

export interface SystemBarsTheme {
  resolved: 'light' | 'dark';
  /** `#RRGGBB` — the bg token of the resolved theme. */
  background: string;
}

interface SystemBarsPlugin {
  setTheme(options: SystemBarsTheme): Promise<void>;
}

// Native side: android/app/src/main/java/com/hamdydraw/lockly/SystemBarsPlugin.java.
// <meta name="theme-color"> does not reach the Android status bar, so the app sets it.
const Native = registerPlugin<SystemBarsPlugin>('SystemBars');

export const systemBars = {
  async setTheme(options: SystemBarsTheme): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;
    try {
      await Native.setTheme(options);
    } catch {
      // The theme still applies inside the WebView; only the system bars lag.
    }
  },
};
