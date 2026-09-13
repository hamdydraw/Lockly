import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { generatePassword, type GenOptions } from '../lib/password';
import { GlassButton } from './ui/GlassButton';

const DEFAULTS: GenOptions = { length: 20, lower: true, upper: true, digits: true, symbols: true };

export function PasswordGenerator({ onGenerate }: { onGenerate: (pw: string) => void }) {
  const [opts, setOpts] = useState<GenOptions>(DEFAULTS);

  const toggle = (k: keyof GenOptions) =>
    setOpts((o) => ({ ...o, [k]: !o[k] as never }));

  return (
    <div className="rounded-xl border border-line-strong bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-fg-muted">
        <span>Length: {opts.length}</span>
        <input
          type="range"
          min={8}
          max={48}
          value={opts.length}
          onChange={(e) => setOpts((o) => ({ ...o, length: Number(e.target.value) }))}
          className="mx-3 flex-1 accent-accent"
        />
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        {(['lower', 'upper', 'digits', 'symbols'] as const).map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-1.5 text-fg-muted">
            <input
              type="checkbox"
              checked={opts[k] as boolean}
              onChange={() => toggle(k)}
              className="accent-accent"
            />
            {k}
          </label>
        ))}
      </div>
      <GlassButton
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => onGenerate(generatePassword(opts))}
      >
        <RefreshCw className="h-4 w-4" />
        Generate password
      </GlassButton>
    </div>
  );
}
