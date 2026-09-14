/** Theme token as a Tailwind colour that keeps opacity modifiers (`bg-accent/10`). */
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Values live in src/index.css per theme (DESIGN.md §3, §12).
      colors: {
        bg: rgb('--bg'),
        surface: { 1: rgb('--surface-1'), 2: rgb('--surface-2'), 3: rgb('--surface-3') },
        line: { DEFAULT: rgb('--line'), strong: rgb('--line-strong') },
        overlay: 'rgb(var(--overlay) / var(--overlay-a))',
        fg: {
          DEFAULT: rgb('--fg'),
          muted: rgb('--fg-muted'),
          subtle: rgb('--fg-subtle'),
          'on-accent': rgb('--fg-on-accent'),
        },
        accent: { DEFAULT: rgb('--accent'), fg: rgb('--accent-fg') },
        secure: rgb('--secure'),
        success: rgb('--success'),
        warning: rgb('--warning'),
        danger: { DEFAULT: rgb('--danger'), solid: rgb('--danger-solid') },
        // Sticky-note paper + ink (client/src/lib/notes.ts maps colour names to these).
        note: {
          amber: rgb('--note-amber'),
          'amber-ink': rgb('--note-amber-ink'),
          rose: rgb('--note-rose'),
          'rose-ink': rgb('--note-rose-ink'),
          sky: rgb('--note-sky'),
          'sky-ink': rgb('--note-sky-ink'),
          mint: rgb('--note-mint'),
          'mint-ink': rgb('--note-mint-ink'),
          lilac: rgb('--note-lilac'),
          'lilac-ink': rgb('--note-lilac-ink'),
          slate: rgb('--note-slate'),
          'slate-ink': rgb('--note-slate-ink'),
        },
      },
      boxShadow: {
        raised: 'var(--shadow-raised)',
        pop: 'var(--shadow-pop)',
      },
      borderRadius: {
        glass: '16px',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(4%, -6%) scale(1.08)' },
          '66%': { transform: 'translate(-5%, 4%) scale(0.95)' },
        },
      },
      animation: {
        'drift-slow': 'drift 30s ease-in-out infinite',
        'drift-slower': 'drift 42s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
