import type { LucideIcon } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { cn } from './cn';

export interface SegmentOption<T extends string> {
  value: T;
  /** Accessible name; also the visible text in the `labeled` variant. */
  label: string;
  icon?: LucideIcon;
  /** Language of the label itself, e.g. 'ar' for "العربية". */
  labelLang?: string;
}

/**
 * A radio group drawn as a segmented control. `compact` is icon-only; `labeled`
 * shows text. Arrow keys move the selection in the visual direction, so Left and
 * Right swap in RTL.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  variant = 'compact',
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  variant?: 'compact' | 'labeled';
  className?: string;
}) {
  const { dir } = useI18n();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = options.findIndex((o) => o.value === value);
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    let next: number;
    switch (e.key) {
      case forward:
      case 'ArrowDown':
        next = (current + 1) % options.length;
        break;
      case backward:
      case 'ArrowUp':
        next = (current - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(options[next]!.value);
    buttons.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5',
        className,
      )}
    >
      {options.map(({ value: optionValue, label, icon: Icon, labelLang }, i) => {
        const checked = value === optionValue;
        return (
          <button
            key={optionValue}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            // Roving tabindex: Tab lands on the selected option, arrows do the rest.
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(optionValue)}
            aria-label={variant === 'compact' ? label : undefined}
            title={variant === 'compact' ? label : undefined}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors duration-150',
              variant === 'compact' ? 'h-8 w-8 max-md:h-11 max-md:w-11' : 'h-9 px-3',
              checked
                ? 'bg-accent/10 text-accent-fg'
                : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
            )}
          >
            {Icon && <Icon className="h-4 w-4" strokeWidth={1.75} />}
            {variant === 'labeled' && (
              <span lang={labelLang} dir={labelLang ? 'auto' : undefined}>
                {label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
