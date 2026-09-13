import { useI18n } from '../../i18n/LanguageProvider';
import { LANGUAGES, type LanguageCode } from '../../i18n/languages';
import { SegmentedControl, type SegmentOption } from './SegmentedControl';

// Each option is labelled in its own language so it is recognisable whatever is active.
const OPTIONS: SegmentOption<LanguageCode>[] = Object.values(LANGUAGES).map((language) => ({
  value: language.code,
  label: language.nativeName,
  labelLang: language.code,
}));

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLanguage, t } = useI18n();

  return (
    <SegmentedControl
      options={OPTIONS}
      value={lang}
      onChange={setLanguage}
      ariaLabel={t('language.label')}
      variant="labeled"
      className={className}
    />
  );
}
