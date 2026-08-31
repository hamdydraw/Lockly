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
          <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-xl border border-white/12 bg-white/5 px-3.5 py-2.5 text-ink',
            'placeholder:text-white/30 transition-all duration-200',
            'focus:outline-none focus:border-cyan-glow/60 focus:bg-white/10 focus:shadow-glow-cyan',
            className,
          )}
          {...rest}
        />
      </label>
    );
  },
);
GlassInput.displayName = 'GlassInput';
