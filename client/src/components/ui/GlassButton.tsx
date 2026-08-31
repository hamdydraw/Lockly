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
        'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' &&
          'bg-gradient-to-r from-violet-glow to-cyan-glow text-[#1a1035] hover:shadow-glow-violet active:scale-[0.98]',
        variant === 'ghost' &&
          'glass text-ink hover:bg-white/10 active:scale-[0.98]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
