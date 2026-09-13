import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { formatBytes, formatNumber, pluralCategory } from './format';
import { interpolate, interpolateNodes } from './interpolate';
import {
  detectLanguage,
  isLanguageCode,
  LANGUAGE_STORAGE_KEY,
  LANGUAGES,
  type Direction,
  type LanguageCode,
} from './languages';
import { ar } from './messages/ar';
import { en, type MessageKey, type Messages, type PluralForms, type PluralKey } from './messages/en';

export type { Direction, LanguageCode } from './languages';
export type { MessageKey, PluralKey } from './messages/en';

type Params = Record<string, string | number>;

const CATALOGS: Record<LanguageCode, Messages> = { en, ar };

export interface I18nContextValue {
  lang: LanguageCode;
  dir: Direction;
  /** Translated string; user-supplied string params are bidi-isolated. */
  t: (key: MessageKey, params?: Params) => string;
  /** Translated sentence with React-node params; string params render in <bdi dir="auto">. */
  tx: (key: MessageKey, params: Record<string, ReactNode>) => ReactNode;
  /** Plural form for `count` (also available as {count}). */
  plural: (key: PluralKey, count: number, params?: Params) => string;
  /** Plural form with React-node params. */
  pluralx: (key: PluralKey, count: number, params: Record<string, ReactNode>) => ReactNode;
  formatNumber: (n: number) => string;
  formatBytes: (bytes: number) => string;
  setLanguage: (next: LanguageCode) => void;
}

function lookup(catalog: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      catalog,
    );
}

function readSaved(): LanguageCode | null {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguageCode(saved) ? saved : null;
  } catch {
    return null;
  }
}

function deviceLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

function initialLanguage(): LanguageCode {
  // public/locale-init.js already painted with this; agree with it.
  const painted = document.documentElement.getAttribute('lang');
  if (isLanguageCode(painted)) return painted;
  return readSaved() ?? detectLanguage(deviceLanguages());
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LanguageCode>(initialLanguage);
  const { dir, locale } = LANGUAGES[lang];
  const messages = CATALOGS[lang];

  const setLanguage = useCallback((next: LanguageCode) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice holds for this session only.
    }
    setLang(next);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const num = (n: number) => formatNumber(locale, n);
    const text = (key: string): string => {
      const found = lookup(messages, key);
      if (typeof found === 'string') return found;
      const fallback = lookup(en, key);
      return typeof fallback === 'string' ? fallback : key;
    };
    const pluralText = (key: string, count: number): string => {
      const forms = (lookup(messages, key) ?? lookup(en, key)) as PluralForms | undefined;
      if (!forms) return key;
      return forms[pluralCategory(locale, count)] ?? forms.other;
    };

    return {
      lang,
      dir,
      t: (key, params) => interpolate(text(key), params, num),
      tx: (key, params) => interpolateNodes(text(key), params, num),
      plural: (key, count, params) =>
        interpolate(pluralText(key, count), { ...params, count }, num),
      pluralx: (key, count, params) =>
        interpolateNodes(pluralText(key, count), { ...params, count }, num),
      formatNumber: num,
      formatBytes: (bytes) =>
        formatBytes(locale, bytes, { b: text('units.b'), kb: text('units.kb'), mb: text('units.mb') }),
      setLanguage,
    };
  }, [lang, dir, locale, messages, setLanguage]);

  // Before paint, so direction and title never lag behind the rendered text.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', dir);
    document.title = value.t('app.documentTitle');
  }, [lang, dir, value]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}
