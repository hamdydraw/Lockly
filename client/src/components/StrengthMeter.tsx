import { estimateStrength } from '../lib/password';

/** Strength bar coloured by score, so a weak password looks weak (DESIGN.md §3.3). */
export function StrengthMeter({ password }: { password: string }) {
  const { score, label } = estimateStrength(password);
  const pct = (score / 4) * 100;
  const tone = score <= 1 ? 'bg-danger' : score === 2 ? 'bg-warning' : 'bg-success';
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={`h-full rounded-full ${tone} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="mt-1 block text-xs text-fg-muted">{label}</span>
    </div>
  );
}
