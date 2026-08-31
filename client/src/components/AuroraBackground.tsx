/**
 * Near-black app backdrop with extremely subtle purple/cyan ambient light.
 * Restrained by design — no bloom, no neon. Sits behind all content.
 */
export function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-base">
      {/* Faint purple ambient — top left */}
      <div
        className="absolute -top-48 -left-40 h-[42rem] w-[42rem] rounded-full blur-3xl animate-drift-slow"
        style={{
          background:
            'radial-gradient(circle, rgba(139,124,255,0.10) 0%, rgba(139,124,255,0) 70%)',
        }}
      />
      {/* Faint cyan ambient — lower right */}
      <div
        className="absolute top-1/2 -right-48 h-[38rem] w-[38rem] rounded-full blur-3xl animate-drift-slower"
        style={{
          background:
            'radial-gradient(circle, rgba(94,231,255,0.07) 0%, rgba(94,231,255,0) 70%)',
        }}
      />
      {/* Subtle top vignette to lift the header area */}
      <div
        className="absolute inset-x-0 top-0 h-64"
        style={{
          background:
            'linear-gradient(to bottom, rgba(139,124,255,0.04), rgba(11,13,23,0))',
        }}
      />
    </div>
  );
}
