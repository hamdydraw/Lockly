import { estimateStrength } from '../lib/password';

/** Violet→cyan gradient strength bar. */
export function StrengthMeter({ password }: { password: string }) {
  const { score, label } = estimateStrength(password);
  const pct = (score / 4) * 100;
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-glow to-cyan-glow transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="mt-1 block text-xs text-muted">{label}</span>
    </div>
  );
}
