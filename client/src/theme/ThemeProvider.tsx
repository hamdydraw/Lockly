import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { systemBars } from './systemBars';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** What the user picked. */
  theme: ThemePreference;
  /** What is on screen. */
  resolved: ResolvedTheme;
  setTheme: (next: ThemePreference) => void;
}

/** Also read by public/theme-init.js before React loads — keep the two in sync. */
export const THEME_STORAGE_KEY = 'lockly.theme';

/** The bg token per theme, for browser chrome and the Android system bars. */
export const THEME_BG = { light: '#F5F6FA', dark: '#0B0D17' } as const;

const LIGHT_QUERY = '(prefers-color-scheme: light)';

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function writePreference(theme: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (e.g. private mode): the choice holds for this session only.
  }
}

function systemTheme(): ResolvedTheme {
  return typeof window.matchMedia === 'function' && window.matchMedia(LIGHT_QUERY).matches
    ? 'light'
    : 'dark';
}

function resolve(theme: ThemePreference): ResolvedTheme {
  return theme === 'system' ? systemTheme() : theme;
}

function applyToDocument(resolved: ResolvedTheme) {
  const root = document.documentElement;
  // Suppress transitions for a frame so every surface switches at once.
  root.setAttribute('data-theme-switching', '');
  root.setAttribute('data-theme', resolved);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BG[resolved]);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.removeAttribute('data-theme-switching')),
  );
  void systemBars.setTheme({ resolved, background: THEME_BG[resolved] });
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readPreference);
  // Start from what theme-init.js already painted so React never re-themes on mount.
  const [resolved, setResolved] = useState<ResolvedTheme>(() => {
    const painted = document.documentElement.getAttribute('data-theme');
    return painted === 'light' || painted === 'dark' ? painted : resolve(readPreference());
  });

  // Layout effect: the DOM switches before the browser paints the new render.
  // Also runs on mount so the Android bars match the WebView from the start.
  useLayoutEffect(() => applyToDocument(resolved), [resolved]);

  useEffect(() => {
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(LIGHT_QUERY);
    const follow = () => setResolved(query.matches ? 'light' : 'dark');
    follow(); // the device may have changed while an explicit theme was chosen
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    writePreference(next);
    setThemeState(next);
    setResolved(resolve(next));
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
