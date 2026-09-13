import { Monitor, Moon, Sun } from 'lucide-react';
import { useI18n } from '../../i18n/LanguageProvider';
import { useTheme, type ThemePreference } from '../../theme/ThemeProvider';
import { SegmentedControl } from './SegmentedControl';

/**
 * System / Light / Dark. `compact` is icon-only (sidebar footer, phone top bar);
 * `labeled` shows text (Settings).
 */
export function ThemeToggle({
  variant = 'compact',
  className,
}: {
  variant?: 'compact' | 'labeled';
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <SegmentedControl<ThemePreference>
      options={[
        { value: 'system', label: t('theme.system'), icon: Monitor },
        { value: 'light', label: t('theme.light'), icon: Sun },
        { value: 'dark', label: t('theme.dark'), icon: Moon },
      ]}
      value={theme}
      onChange={setTheme}
      ariaLabel={t('theme.label')}
      variant={variant}
      className={className}
    />
  );
}
