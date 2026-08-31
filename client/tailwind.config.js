/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Premium dark cybersecurity SaaS palette
        base: '#0B0D17', // app background
        sidebar: '#111426', // sidebar surface
        card: '#171B2D', // card / row surface
        'card-hover': '#1D2238', // card / row hover
        line: '#272D42', // borders & dividers
        ink: '#F4F5F7', // primary text
        // Brand accents — used subtly
        violet: {
          glow: '#8B7CFF',
        },
        cyan: {
          glow: '#5EE7FF',
        },
        danger: '#FF647C',
      },
      boxShadow: {
        // Restrained, expensive-feeling elevation (no neon bloom)
        card: '0 1px 2px rgba(0, 0, 0, 0.4)',
        pop: '0 8px 24px rgba(0, 0, 0, 0.45)',
        'glow-violet': '0 0 0 1px rgba(139, 124, 255, 0.35)',
        'glow-cyan': '0 0 0 1px rgba(94, 231, 255, 0.35)',
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
