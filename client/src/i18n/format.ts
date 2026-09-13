// Locale-aware formatting on top of the built-in Intl APIs. Locales come from
// languages.ts; the Arabic tag pins Western digits (ar-u-nu-latn).

const numberFormats = new Map<string, Intl.NumberFormat>();
const pluralRules = new Map<string, Intl.PluralRules>();

export function formatNumber(locale: string, n: number, opts?: Intl.NumberFormatOptions): string {
  const key = `${locale}|${opts ? JSON.stringify(opts) : ''}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, opts);
    numberFormats.set(key, format);
  }
  return format.format(n);
}

export function pluralCategory(locale: string, n: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules.select(n);
}

const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 };

/** Same thresholds as the old humanSize(): bytes, then KB and MB with one decimal. */
export function formatBytes(
  locale: string,
  bytes: number,
  units: { b: string; kb: string; mb: string },
): string {
  if (bytes < 1024) return `${formatNumber(locale, bytes)} ${units.b}`;
  if (bytes < 1024 * 1024) return `${formatNumber(locale, bytes / 1024, ONE_DECIMAL)} ${units.kb}`;
  return `${formatNumber(locale, bytes / (1024 * 1024), ONE_DECIMAL)} ${units.mb}`;
}
