import { Eye } from 'lucide-react';
import { useMemo, type MouseEvent } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { INK_ACCENT, INK_TEXT, maskBody, parseLines } from '../../lib/notes';
import type { NoteColor } from '../../lib/types';
import { cn } from '../ui/cn';

/**
 * Read view of a note body. Plain lines render as text; "- [ ]" lines become
 * real checkboxes that toggle in place without opening the editor.
 */
export function NoteBody({
  body,
  color,
  onToggle,
  clamp,
}: {
  body: string;
  color: NoteColor;
  onToggle: (lineIndex: number) => void;
  /** Card mode: cap the height and fade out long notes. */
  clamp?: boolean;
}) {
  const { t } = useI18n();
  const lines = useMemo(() => parseLines(body), [body]);
  const long = clamp && (lines.length > 12 || body.length > 480);

  return (
    <div
      dir="auto"
      className={cn(
        'text-sm leading-relaxed text-fg',
        clamp && 'max-h-[280px] overflow-hidden',
        long && '[mask-image:linear-gradient(to_bottom,black_70%,transparent)]',
      )}
    >
      {lines.map((line, i) =>
        line.check ? (
          <label
            key={i}
            className="flex cursor-pointer items-start gap-2 py-0.5"
            // A tap on the checkbox must not open the card behind it.
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={line.check.done}
              onChange={() => onToggle(i)}
              aria-label={t('notes.toggleItem', { text: line.text })}
              className={cn('mt-1 h-4 w-4 shrink-0 cursor-pointer rounded', INK_ACCENT[color])}
            />
            <span className={cn('min-w-0 break-words', line.check.done && 'text-fg-muted line-through')}>
              {line.text}
            </span>
          </label>
        ) : line.text === '' ? (
          <div key={i} className="h-3" aria-hidden />
        ) : (
          <p key={i} className="whitespace-pre-wrap break-words">
            {line.text}
          </p>
        ),
      )}
    </div>
  );
}

/**
 * Stand-in for a hidden body: one row of dots per line, like a password field,
 * with a reveal affordance. The real text is not in the DOM at all.
 */
export function MaskedBody({
  body,
  color,
  onReveal,
  hint,
  className,
}: {
  body: string;
  color: NoteColor;
  onReveal: () => void;
  /** Longer explanation for the editor; the card uses the short default. */
  hint?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const rows = useMemo(() => maskBody(body).slice(0, 6), [body]);

  function reveal(e: MouseEvent) {
    e.stopPropagation();
    onReveal();
  }

  return (
    <button
      type="button"
      onClick={reveal}
      aria-label={t('notes.reveal')}
      title={t('notes.hiddenHint')}
      // Flex column keeps the rows at the top; a button would otherwise centre them vertically.
      className={cn('flex w-full flex-col items-start rounded-lg text-start', className)}
    >
      <div aria-hidden className="select-none leading-relaxed text-fg-muted">
        {rows.map((row, i) => (
          <p key={i} className="text-[11px] tracking-[0.18em]">
            {row || ' '}
          </p>
        ))}
      </div>
      <span className={cn('mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium', INK_TEXT[color])}>
        <Eye className="h-3.5 w-3.5" strokeWidth={2} />
        {hint ?? t('notes.hiddenHint')}
      </span>
    </button>
  );
}
