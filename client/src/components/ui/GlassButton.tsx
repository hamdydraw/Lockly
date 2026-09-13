import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

export function GlassButton({
  variant = 'primary',
  className,
  children,
  ...rest
}: GlassButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold',
        'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' &&
          'bg-accent text-fg-on-accent hover:bg-accent/90 active:scale-[0.98]',
        variant === 'ghost' &&
          'border border-line bg-surface-2 text-fg shadow-raised hover:bg-surface-3 active:scale-[0.98]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
