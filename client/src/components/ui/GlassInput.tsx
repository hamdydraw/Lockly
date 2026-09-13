import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, className, id, ...rest }, ref) => {
    return (
      <label className="block">
        {label && (
          <span className="mb-1.5 block text-sm font-medium text-fg-muted">{label}</span>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-xl border border-line-strong bg-surface-2 px-3.5 py-2.5 text-fg',
            'placeholder:text-fg-subtle transition-all duration-200',
            'focus:outline-none focus:border-accent-fg',
            className,
          )}
          {...rest}
        />
      </label>
    );
  },
);
GlassInput.displayName = 'GlassInput';
