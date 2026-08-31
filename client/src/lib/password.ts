const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
};

export interface GenOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
}

/** Cryptographically strong random password from the selected character sets. */
export function generatePassword(opts: GenOptions): string {
  let pool = '';
  if (opts.lower) pool += SETS.lower;
  if (opts.upper) pool += SETS.upper;
  if (opts.digits) pool += SETS.digits;
  if (opts.symbols) pool += SETS.symbols;
  if (!pool) pool = SETS.lower;

  const out: string[] = [];
  const rnd = new Uint32Array(opts.length);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < opts.length; i++) {
    out.push(pool[rnd[i] % pool.length]);
  }
  return out.join('');
}

export interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

/** Lightweight strength estimate based on length + character-class variety. */
export function estimateStrength(pw: string): Strength {
  if (!pw) return { score: 0, label: 'Empty' };
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/[0-9]/.test(pw)) variety++;
  if (/[^a-zA-Z0-9]/.test(pw)) variety++;

  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (variety >= 3) score++;
  if (pw.length >= 16 && variety >= 3) score++;
  score = Math.min(score, 4) as Strength['score'];

  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  return { score: score as Strength['score'], label: labels[score] };
}
