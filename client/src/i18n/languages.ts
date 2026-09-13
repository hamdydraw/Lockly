/**
 * Supported interface languages. Adding a language = one entry here plus a
 * catalog in ./messages. public/locale-init.js duplicates the code and RTL
 * lists (it runs before any module loads) — keep the two in sync.
 */
export const LANGUAGES = {
  en: { code: 'en', dir: 'ltr', nativeName: 'English', locale: 'en' },
  // -u-nu-latn keeps Western digits 0–9 in Arabic number formatting.
  ar: { code: 'ar', dir: 'rtl', nativeName: 'العربية', locale: 'ar-u-nu-latn' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;
export type Direction = 'ltr' | 'rtl';

export const LANGUAGE_STORAGE_KEY = 'lockly.lang';

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LANGUAGES, value);
}

/** First supported language in the device's preference order, else English. */
export function detectLanguage(preferred: readonly string[]): LanguageCode {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLanguageCode(base)) return base;
  }
  return 'en';
}
