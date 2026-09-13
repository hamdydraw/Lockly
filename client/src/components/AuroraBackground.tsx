import { useTheme } from '../theme/ThemeProvider';

/**
 * App backdrop. Dark: near-black with extremely subtle accent/secure ambient
 * light — restrained by design, no bloom. Light: a flat canvas, since the glow
 * reads as smudges on a pale ground (DESIGN.md §5). Sits behind all content.
 */
export function AuroraBackground() {
  const { resolved } = useTheme();

  if (resolved === 'light') {
    return <div className="fixed inset-0 -z-10 bg-bg" />;
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-bg">
      {/* Faint accent ambient — top left */}
      <div
        className="absolute -top-48 -left-40 h-[42rem] w-[42rem] rounded-full blur-3xl animate-drift-slow"
        style={{
          background: 'radial-gradient(circle, rgb(var(--accent-fg) / 0.10) 0%, transparent 70%)',
        }}
      />
      {/* Faint secure ambient — lower right */}
      <div
        className="absolute top-1/2 -right-48 h-[38rem] w-[38rem] rounded-full blur-3xl animate-drift-slower"
        style={{
          background: 'radial-gradient(circle, rgb(var(--secure) / 0.07) 0%, transparent 70%)',
        }}
      />
      {/* Subtle top vignette to lift the header area */}
      <div
        className="absolute inset-x-0 top-0 h-64"
        style={{
          background: 'linear-gradient(to bottom, rgb(var(--accent-fg) / 0.04), transparent)',
        }}
      />
    </div>
  );
}
