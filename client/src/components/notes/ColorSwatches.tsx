import { Check } from 'lucide-react';
import { useI18n } from '../../i18n/LanguageProvider';
import { INK_BG, NOTE_COLORS } from '../../lib/notes';
import type { NoteColor } from '../../lib/types';
import { cn } from '../ui/cn';

/** Paper-colour picker: six ink dots as a radio group. */
export function ColorSwatches({
  value,
  onChange,
  className,
}: {
  value: NoteColor;
  onChange: (color: NoteColor) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t('notes.color')} className={cn('flex items-center gap-1.5', className)}>
      {NOTE_COLORS.map((color) => {
        const checked = color === value;
        const label = t(`notes.colors.${color}`);
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={label}
            title={label}
            onClick={() => onChange(color)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-150 max-md:h-9 max-md:w-9',
              INK_BG[color],
              checked ? 'ring-2 ring-fg/70' : 'hover:-translate-y-0.5',
            )}
          >
            {/* Canvas colour: dark tick on the bright dark-theme inks, light tick on the deep light-theme inks. */}
            {checked && <Check className="h-3.5 w-3.5 text-bg" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
