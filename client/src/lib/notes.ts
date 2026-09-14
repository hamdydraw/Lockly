import type { NoteColor } from './types';

/** Paper colours in swatch order. Must match NOTE_COLORS in server/src/routes/notes.ts. */
export const NOTE_COLORS: readonly NoteColor[] = ['amber', 'rose', 'sky', 'mint', 'lilac', 'slate'];

export function isNoteColor(value: string): value is NoteColor {
  return (NOTE_COLORS as readonly string[]).includes(value);
}

// Full class names, spelled out so Tailwind's content scanner sees them.
export const PAPER: Record<NoteColor, string> = {
  amber: 'bg-note-amber',
  rose: 'bg-note-rose',
  sky: 'bg-note-sky',
  mint: 'bg-note-mint',
  lilac: 'bg-note-lilac',
  slate: 'bg-note-slate',
};

export const INK_BG: Record<NoteColor, string> = {
  amber: 'bg-note-amber-ink',
  rose: 'bg-note-rose-ink',
  sky: 'bg-note-sky-ink',
  mint: 'bg-note-mint-ink',
  lilac: 'bg-note-lilac-ink',
  slate: 'bg-note-slate-ink',
};

export const INK_TEXT: Record<NoteColor, string> = {
  amber: 'text-note-amber-ink',
  rose: 'text-note-rose-ink',
  sky: 'text-note-sky-ink',
  mint: 'text-note-mint-ink',
  lilac: 'text-note-lilac-ink',
  slate: 'text-note-slate-ink',
};

/** Native checkbox tint (`accent-color`). */
export const INK_ACCENT: Record<NoteColor, string> = {
  amber: 'accent-note-amber-ink',
  rose: 'accent-note-rose-ink',
  sky: 'accent-note-sky-ink',
  mint: 'accent-note-mint-ink',
  lilac: 'accent-note-lilac-ink',
  slate: 'accent-note-slate-ink',
};

// ---- Checklists -------------------------------------------------------------
//
// A line that starts with "- [ ]" or "- [x]" is a checklist item. The body stays
// plain text, so it round-trips through the editor and copies cleanly; the card
// just renders those lines as real checkboxes.

const CHECK_RE = /^(\s*[-*]\s\[)( |x|X)(\]\s?)(.*)$/;

export interface BodyLine {
  /** The text after the checkbox marker, or the whole line for plain text. */
  text: string;
  /** Present when this line is a checklist item. */
  check?: { done: boolean };
}

export function parseLines(body: string): BodyLine[] {
  return body.split('\n').map((line) => {
    const m = CHECK_RE.exec(line);
    if (!m) return { text: line };
    return { text: m[4] ?? '', check: { done: m[2] !== ' ' } };
  });
}

/** Flips the checkbox on line `index`; returns the body unchanged if it is not a checklist line. */
export function toggleLine(body: string, index: number): string {
  const lines = body.split('\n');
  const line = lines[index];
  if (line === undefined) return body;
  const m = CHECK_RE.exec(line);
  if (!m) return body;
  lines[index] = `${m[1]}${m[2] === ' ' ? 'x' : ' '}${m[3]}${m[4] ?? ''}`;
  return lines.join('\n');
}

/** Done/total for the card's progress chip, or null when the note has no checklist. */
export function checklistProgress(lines: BodyLine[]): { done: number; total: number } | null {
  let done = 0;
  let total = 0;
  for (const line of lines) {
    if (!line.check) continue;
    total += 1;
    if (line.check.done) done += 1;
  }
  return total ? { done, total } : null;
}

// ---- Search -----------------------------------------------------------------

/**
 * Case-insensitive match against title and body — everything is already decrypted.
 * A hidden note matches on its title only, so search cannot be used to probe
 * masked text one character at a time.
 */
export function matchesQuery(
  note: { title: string; body: string; hidden: boolean },
  q: string,
): boolean {
  const needle = q.trim().toLocaleLowerCase();
  if (!needle) return true;
  if (note.title.toLocaleLowerCase().includes(needle)) return true;
  return !note.hidden && note.body.toLocaleLowerCase().includes(needle);
}

/** Password-style stand-in for a hidden body: a row of dots per line, length capped. */
export function maskBody(body: string): string[] {
  return body.split('\n').map((line) => '•'.repeat(Math.min(line.trim().length, 24)));
}

/** How long a revealed hidden note stays readable on the board before masking again. */
export const REVEAL_MS = 30_000;

// ---- Relative time ----------------------------------------------------------

const rtfs = new Map<string, Intl.RelativeTimeFormat>();

/** "2 hours ago", "yesterday", "now" — localised, coarse enough to stay readable. */
export function formatRelative(locale: string, iso: string, now = Date.now()): string {
  let rtf = rtfs.get(locale);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    rtfs.set(locale, rtf);
  }
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return rtf.format(0, 'second');
  if (abs < 45 * 60) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 22 * 3600) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 26 * 86400) return rtf.format(Math.round(seconds / 86400), 'day');
  if (abs < 320 * 86400) return rtf.format(Math.round(seconds / (30 * 86400)), 'month');
  return rtf.format(Math.round(seconds / (365 * 86400)), 'year');
}

/**
 * Enter pressed on a checklist line: continue the list with a fresh unchecked
 * item, or end the list when the current item is still empty. Returns null when
 * the caret is not on a checklist line so the textarea keeps its default Enter.
 */
export function continueChecklist(
  body: string,
  caret: number,
): { body: string; caret: number } | null {
  const lineStart = body.lastIndexOf('\n', caret - 1) + 1;
  const nextBreak = body.indexOf('\n', caret);
  const lineEnd = nextBreak === -1 ? body.length : nextBreak;
  const m = CHECK_RE.exec(body.slice(lineStart, lineEnd));
  if (!m) return null;

  if ((m[4] ?? '').trim() === '') {
    // Empty item → drop its marker and leave a plain empty line.
    return { body: body.slice(0, lineStart) + body.slice(lineEnd), caret: lineStart };
  }
  const insert = `\n${m[1]} ] `;
  return { body: body.slice(0, caret) + insert + body.slice(caret), caret: caret + insert.length };
}

/** Board order: pinned first, then newest first. Edits never reshuffle the board. */
export function byBoardOrder(a: { pinned: boolean; createdAt: string }, b: { pinned: boolean; createdAt: string }): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return b.createdAt.localeCompare(a.createdAt);
}
