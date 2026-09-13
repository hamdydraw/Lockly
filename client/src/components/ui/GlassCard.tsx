import type { HTMLAttributes } from 'react';
import { cn } from './cn';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
}

export function GlassCard({ strong, className, children, ...rest }: GlassCardProps) {
  return (
    <div
      className={cn(
        strong
          ? 'border border-line bg-surface-1 shadow-pop'
          : 'border border-line bg-surface-2 shadow-raised',
        'rounded-glass p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
