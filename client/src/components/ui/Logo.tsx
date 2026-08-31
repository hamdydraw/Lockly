import { useId } from 'react';
import { cn } from './cn';

interface LogoProps {
  /** Pixel size of the square mark. Defaults to 32. */
  size?: number;
  className?: string;
}

/**
 * Lockly brand mark — a crest shield (security) with a geometric "L" cut into
 * it as negative space and a small keyhole (lock). Deliberately not a generic
 * padlock. The shield is filled with the violet→cyan brand gradient; the "L"
 * and keyhole are punched out via an SVG mask so the surface shows through.
 */
export function Logo({ size = 32, className }: LogoProps) {
  const gradId = useId();
  const maskId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Lockly"
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B7CFF" />
          <stop offset="1" stopColor="#5EE7FF" />
        </linearGradient>
        <mask id={maskId}>
          {/* Everything white is kept; black is cut away */}
          <rect width="40" height="40" fill="black" />
          {/* Shield body (kept) */}
          <path
            d="M20 3.5 L33 7.7 C33.4 7.8 33.7 8.2 33.7 8.7 V19.6 C33.7 27.7 28.2 34 20 36.7 C11.8 34 6.3 27.7 6.3 19.6 V8.7 C6.3 8.2 6.6 7.8 7 7.7 Z"
            fill="white"
          />
          {/* "L" monogram (cut out) */}
          <path d="M15.6 12 H19 V23.2 H25.8 V26.6 H15.6 Z" fill="black" />
          {/* Keyhole — circle + slit (cut out) */}
          <circle cx="24" cy="16.4" r="2.2" fill="black" />
          <path d="M23.1 16.8 H24.9 L25.5 20 H22.5 Z" fill="black" />
        </mask>
      </defs>

      {/* Gradient shield revealed through the mask */}
      <rect width="40" height="40" fill={`url(#${gradId})`} mask={`url(#${maskId})`} />

      {/* Subtle top highlight edge for depth */}
      <path
        d="M20 3.5 L33 7.7 C33.4 7.8 33.7 8.2 33.7 8.7 V19.6 C33.7 27.7 28.2 34 20 36.7 C11.8 34 6.3 27.7 6.3 19.6 V8.7 C6.3 8.2 6.6 7.8 7 7.7 Z"
        stroke="white"
        strokeOpacity="0.18"
        strokeWidth="0.75"
      />
    </svg>
  );
}
