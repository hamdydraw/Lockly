import { motion } from 'framer-motion';
import { Copy, Eye, EyeOff, Pin, PinOff, Trash2, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { LANGUAGES } from '../../i18n/languages';
import {
  checklistProgress,
  formatRelative,
  INK_BG,
  INK_TEXT,
  PAPER,
  parseLines,
  REVEAL_MS,
} from '../../lib/notes';
import type { Note } from '../../lib/types';
import { cn } from '../ui/cn';
import { MaskedBody, NoteBody } from './NoteBody';

interface Props {
  note: Note;
  onOpen: () => void;
  onTogglePin: () => void;
  onToggleCheck: (lineIndex: number) => void;
  onCopy: () => void;
  onDelete: () => void;
}

/**
 * One sticky on the board. The whole card opens the editor; the pin, copy and
 * delete controls, and checklist boxes, stop the click so they act in place.
 * A hidden note shows dots instead of text until revealed, and masks itself
 * again after REVEAL_MS.
 */
export function NoteCard({ note, onOpen, onTogglePin, onToggleCheck, onCopy, onDelete }: Props) {
  const { t, lang } = useI18n();
  const lines = useMemo(() => parseLines(note.body), [note.body]);
  const progress = checklistProgress(lines);
  const when = formatRelative(LANGUAGES[lang].locale, note.updatedAt);
  const [revealed, setRevealed] = useState(false);
  const masked = note.hidden && !revealed;

  useEffect(() => {
    if (!revealed) return;
    const id = window.setTimeout(() => setRevealed(false), REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [revealed]);

  // Re-mask as soon as the note is marked hidden (e.g. from the editor).
  useEffect(() => {
    if (!note.hidden) setRevealed(false);
  }, [note.hidden]);

  const revealOnHover =
    'opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      role="button"
      tabIndex={0}
      aria-label={t('notes.openNote', { title: note.title || t('notes.untitled') })}
      onClick={onOpen}
      onKeyDown={(e) => {
        // Only when the card itself is focused — not a checkbox or action inside it.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        'group relative mb-3 cursor-pointer break-inside-avoid rounded-glass border border-fg/10 p-4 shadow-raised',
        'transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-pop',
        PAPER[note.color],
      )}
    >
      {/* "Tape" strip in the note's ink, and the pin. */}
      <div className="mb-3 flex items-center justify-between">
        <span aria-hidden className={cn('h-1.5 w-10 rounded-full', INK_BG[note.color])} />
        <Action
          label={note.pinned ? t('notes.unpin') : t('notes.pin')}
          icon={note.pinned ? PinOff : Pin}
          onClick={onTogglePin}
          className={cn(note.pinned ? INK_TEXT[note.color] : revealOnHover)}
        />
      </div>

      {note.title && (
        <h3 dir="auto" className="mb-1.5 break-words text-[15px] font-semibold leading-snug text-fg">
          {note.title}
        </h3>
      )}
      {masked ? (
        note.body && <MaskedBody body={note.body} color={note.color} onReveal={() => setRevealed(true)} />
      ) : note.body ? (
        <NoteBody body={note.body} color={note.color} onToggle={onToggleCheck} clamp />
      ) : (
        !note.title && <p className="text-sm italic text-fg-subtle">{t('notes.untitled')}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-[12px] text-fg-subtle">
          <span className="truncate">{t('notes.edited', { when })}</span>
          {progress && !masked && (
            <span
              className={cn(
                'shrink-0 rounded-full bg-fg/[0.06] px-1.5 py-0.5 font-medium tabular-nums',
                INK_TEXT[note.color],
              )}
            >
              {t('notes.checklistProgress', { done: progress.done, total: progress.total })}
            </span>
          )}
          {note.hidden && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full bg-fg/[0.06] px-1.5 py-0.5 font-medium',
                INK_TEXT[note.color],
              )}
            >
              <EyeOff className="h-3 w-3" strokeWidth={2} />
              {revealed ? t('notes.revealsAgain', { seconds: REVEAL_MS / 1000 }) : t('notes.hidden')}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {note.hidden && (
            <Action
              label={revealed ? t('notes.conceal') : t('notes.reveal')}
              icon={revealed ? EyeOff : Eye}
              onClick={() => setRevealed((r) => !r)}
              className={revealed ? INK_TEXT[note.color] : undefined}
            />
          )}
          <div className={cn('flex items-center gap-0.5', revealOnHover)}>
            <Action label={t('notes.copyBody')} icon={Copy} onClick={onCopy} />
            <Action label={t('common.delete')} icon={Trash2} onClick={onDelete} danger />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Action({
  label,
  icon: Icon,
  onClick,
  danger,
  className,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
  className?: string;
}) {
  function handle(e: MouseEvent) {
    e.stopPropagation();
    onClick();
  }
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 max-md:h-9 max-md:w-9',
        danger ? 'hover:bg-danger/10 hover:text-danger' : 'hover:bg-fg/[0.06] hover:text-fg',
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}
