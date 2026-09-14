import { useMemo } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { INK_ACCENT, parseLines } from '../../lib/notes';
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
