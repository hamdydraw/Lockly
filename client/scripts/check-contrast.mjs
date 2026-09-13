#!/usr/bin/env node
// WCAG 2.x contrast check for the DESIGN.md §3 token pairs, in both themes.
// Zero dependencies: reads the token blocks from src/index.css and exits 1 if
// any pair falls below its threshold (or a theme block is missing).
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/index.css');
const css = readFileSync(cssPath, 'utf8');

function tokens(selector) {
  const match = css.match(selector);
  if (!match) return null;
  const vars = {};
  for (const [, name, r, g, b] of match[1].matchAll(/--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
    vars[name] = [Number(r), Number(g), Number(b)];
  }
  return vars;
}

const themes = {
  dark: tokens(/:root,\s*html\[data-theme='dark'\]\s*\{([^}]*)\}/),
  light: tokens(/html\[data-theme='light'\]\s*\{([^}]*)\}/),
};

const channel = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum ratio]
const pairs = [];
for (const fg of ['fg', 'fg-muted']) {
  for (const bg of ['bg', 'surface-1', 'surface-2', 'surface-3']) pairs.push([fg, bg, 4.5]);
}
// fg-subtle is for placeholders and decorative meta only (DESIGN.md §3.2).
pairs.push(['fg-subtle', 'surface-2', 3]);
for (const fg of ['accent-fg', 'secure', 'success', 'warning', 'danger']) {
  pairs.push([fg, 'surface-2', 4.5]);
}
pairs.push(['fg-on-accent', 'accent', 4.5], ['fg-on-accent', 'danger-solid', 4.5]);

let failures = 0;
for (const [name, vars] of Object.entries(themes)) {
  console.log(`\n${name}`);
  if (!vars) {
    console.log(`  FAIL  token block not found in ${cssPath}`);
    failures++;
    continue;
  }
  for (const [fg, bg, min] of pairs) {
    if (!vars[fg] || !vars[bg]) {
      console.log(`  FAIL  ${fg} on ${bg}: token missing`);
      failures++;
      continue;
    }
    const ratio = contrast(vars[fg], vars[bg]);
    const ok = ratio >= min;
    if (!ok) failures++;
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'}  ${`${fg} on ${bg}`.padEnd(28)} ${ratio.toFixed(2).padStart(5)}:1  (min ${min}:1)`,
    );
  }
}

console.log(failures ? `\n${failures} contrast check(s) failed.` : '\nAll contrast checks passed.');
process.exit(failures ? 1 : 0);
