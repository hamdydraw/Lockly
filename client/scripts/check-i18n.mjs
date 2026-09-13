#!/usr/bin/env node
// i18n gate for the client (specs/002-arabic-rtl, research R13). Zero dependencies.
//   1. every English error the server or lib/api.ts can send is mapped in src/i18n/errors.ts
//   2. ar.ts has no empty strings and nothing left identical to the English catalog
//   3. every {placeholder} used in en.ts strings also appears in ar.ts strings
//   4. no physical-direction Tailwind classes (use ms-/pe-/start-/text-end …); a line
//      commented `i18n-allow-physical` exempts the next line
//   5. no hard-coded English UI text in .tsx files
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const client = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(client, '..');
const rel = (p) => relative(root, p).replace(/\\/g, '/');
const read = (p) => readFileSync(p, 'utf8');

function walk(dir, ext) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, ext));
    else if (name.endsWith(ext)) out.push(p);
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Blanks out comments while keeping offsets, so line numbers stay right. */
const stripComments = (src) =>
  src
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, (s) => s.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, (s) => s.replace(/[^\n]/g, ' '));

const results = [];
function check(name, problems) {
  results.push({ name, problems });
  console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${name}${problems.length ? ` (${problems.length})` : ''}`);
  for (const p of problems.slice(0, 50)) console.log(`      ${p}`);
  if (problems.length > 50) console.log(`      … ${problems.length - 50} more`);
}

// ---- 1. server/client error coverage -------------------------------------
{
  const problems = [];
  const errorsPath = join(client, 'src/i18n/errors.ts');
  let errorsSrc = '';
  try {
    errorsSrc = read(errorsPath);
  } catch {
    problems.push(`${rel(errorsPath)} not found`);
  }
  const messages = [];
  for (const file of walk(join(root, 'server/src'), '.ts').filter((f) => !f.endsWith('.test.ts'))) {
    const src = read(file);
    for (const m of src.matchAll(/new HttpError\(\s*\d+\s*,\s*'([^']+)'/g)) messages.push([m[1], file, m.index, src]);
    for (const m of src.matchAll(/error:\s*'([^']+)'/g)) messages.push([m[1], file, m.index, src]);
  }
  const api = join(client, 'src/lib/api.ts');
  const apiSrc = read(api);
  for (const m of apiSrc.matchAll(/new ApiError\([^,]+,\s*(?:[\w.]+\s*\?\?\s*)?(['"])((?:(?!\1).)*)\1\s*\)/g)) {
    messages.push([m[2], api, m.index, apiSrc]);
  }
  if (errorsSrc) {
    for (const [msg, file, index, src] of messages) {
      if (!errorsSrc.includes(msg)) problems.push(`${rel(file)}:${lineOf(src, index)} unmapped "${msg}"`);
    }
  }
  check(`server/client error messages mapped (${messages.length} found)`, problems);
}

// ---- 2 & 3. catalog sanity and placeholder parity ------------------------
const enPath = join(client, 'src/i18n/messages/en.ts');
const arPath = join(client, 'src/i18n/messages/ar.ts');
/** String literal contents (single/double quoted), skipping imports and type-level code. */
function literals(src) {
  const body = src.replace(/^import .*$/gm, '').replace(/^type [\s\S]*$/m, '');
  return [...body.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map((m) => ({ value: m[2], index: m.index }));
}
{
  const problems = [];
  let en = '';
  let ar = '';
  try {
    en = read(enPath);
    ar = read(arPath);
  } catch {
    problems.push('catalog files missing');
  }
  if (en && ar) {
    const enValues = new Set(literals(en).map((l) => l.value));
    for (const { value, index } of literals(ar)) {
      if (value === '') problems.push(`${rel(arPath)}:${lineOf(ar, index)} empty string`);
      // Strings with no words once placeholders are removed (e.g. "{folder} · {summary}") may match.
      const hasWords = /\p{L}{2,}/u.test(value.replace(/\{\w+\}/g, ''));
      if (hasWords && enValues.has(value)) {
        problems.push(`${rel(arPath)}:${lineOf(ar, index)} untranslated "${value}"`);
      }
    }
  }
  check('Arabic catalog complete and translated', problems);

  const parity = [];
  if (en && ar) {
    const tokens = (src) => new Set(literals(src).flatMap((l) => [...l.value.matchAll(/\{(\w+)\}/g)].map((t) => t[1])));
    const arTokens = tokens(ar);
    for (const token of tokens(en)) {
      if (!arTokens.has(token)) parity.push(`{${token}} used in en.ts but missing from ar.ts`);
    }
  }
  check('placeholder parity en ↔ ar', parity);
}

// ---- 4 & 5. component hygiene --------------------------------------------
const tsx = walk(join(client, 'src'), '.tsx');
const PHYSICAL =
  /^(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr)-|^(?:[a-z0-9-]+:)*-?(?:left|right)-|^(?:[a-z0-9-]+:)*text-(?:left|right)$|^(?:[a-z0-9-]+:)*border-(?:l|r)(?:-|$)|^(?:[a-z0-9-]+:)*rounded-(?:l|r|tl|tr|bl|br)(?:-|$)/;
const DIRECTION_ALLOW = new Set(['left-1/2']);
{
  const problems = [];
  for (const file of tsx) {
    const raw = read(file);
    const rawLines = raw.split('\n');
    const src = stripComments(raw);
    for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      const line = lineOf(src, m.index);
      if (rawLines[line - 2]?.includes('i18n-allow-physical')) continue;
      for (const token of m[2].split(/\s+/)) {
        if (!token || token.startsWith('rtl:') || token.startsWith('ltr:')) continue;
        if (DIRECTION_ALLOW.has(token.replace(/^(?:[a-z0-9-]+:)*/, ''))) continue;
        if (PHYSICAL.test(token)) problems.push(`${rel(file)}:${line} "${token}"`);
      }
    }
  }
  check('no physical-direction classes', problems);
}
// Technical tokens that are the same in every language.
const TEXT_ALLOW = new Set(['Lockly', 'you@example.com', 'https://…', '192.168.1.20:4000', 'http://', 'https://']);
{
  const problems = [];
  for (const file of tsx) {
    const src = stripComments(read(file));
    for (const m of src.matchAll(/>([^<>{}]*)</g)) {
      // `=> Promise<T>` and similar arrow return types are TypeScript, not JSX text.
      if (src[m.index - 1] === '=') continue;
      const text = m[1].trim();
      if (!/[A-Za-z]{3,}/.test(text) || /[;=()]/.test(text) || TEXT_ALLOW.has(text)) continue;
      problems.push(`${rel(file)}:${lineOf(src, m.index)} text "${text.slice(0, 60)}"`);
    }
    for (const m of src.matchAll(/\b(aria-label|title|placeholder|alt|label)="([^"]*)"/g)) {
      if (!/[A-Za-z]{2,}/.test(m[2]) || TEXT_ALLOW.has(m[2])) continue;
      problems.push(`${rel(file)}:${lineOf(src, m.index)} ${m[1]}="${m[2]}"`);
    }
  }
  check('no hard-coded English UI text', problems);
}

const failed = results.filter((r) => r.problems.length).length;
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll i18n checks passed.');
process.exit(failed ? 1 : 0);
