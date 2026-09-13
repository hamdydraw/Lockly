import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { useTheme, type ThemePreference } from '../../theme/ThemeProvider';
import { cn } from './cn';

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

/**
 * System / Light / Dark as a radio group. `compact` is icon-only (sidebar footer,
 * phone top bar); `labeled` shows text (Settings). Arrow keys move the selection.
 */
export function ThemeToggle({
  variant = 'compact',
  className,
}: {
  variant?: 'compact' | 'labeled';
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = OPTIONS.findIndex((o) => o.value === theme);
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % OPTIONS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + OPTIONS.length) % OPTIONS.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = OPTIONS.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    setTheme(OPTIONS[next]!.value);
    buttons.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }, i) => {
        const checked = theme === value;
        return (
          <button
            key={value}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            // Roving tabindex: Tab lands on the selected option, arrows do the rest.
            tabIndex={checked ? 0 : -1}
            onClick={() => setTheme(value)}
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
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {variant === 'labeled' && label}
          </button>
        );
      })}
    </div>
  );
}
