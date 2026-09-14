import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, ListChecks, Loader2, Pin, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { LANGUAGES } from '../../i18n/languages';
import { formatRelative, INK_BG, INK_TEXT, PAPER } from '../../lib/notes';
import type { Note, NoteColor, NoteInput } from '../../lib/types';
import { cn } from '../ui/cn';
import { GlassButton } from '../ui/GlassButton';
import { ColorSwatches } from './ColorSwatches';
import { checklistKeyDown, insertChecklistItem, useAutoGrow } from './textarea';

interface Props {
  /** The note being edited; null closes the editor. */
  note: Note | null;
  onClose: () => void;
  onSave: (id: string, patch: NoteInput) => Promise<unknown>;
  onRequestDelete: (note: Note) => void;
}

/** Full-size sticky. Every change autosaves; closing flushes anything pending. */
export function NoteEditor({ note, onClose, onSave, onRequestDelete }: Props) {
  return (
    <AnimatePresence>
      {note && (
        // Keyed by id so switching notes starts from that note's saved text.
        <Sheet key={note.id} note={note} onClose={onClose} onSave={onSave} onRequestDelete={onRequestDelete} />
      )}
    </AnimatePresence>
  );
}

interface Draft {
  title: string;
  body: string;
  color: NoteColor;
  pinned: boolean;
}

type Status = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 700;

function Sheet({ note, onClose, onSave, onRequestDelete }: Props & { note: Note }) {
  const { t, lang } = useI18n();
  const [draft, setDraft] = useState<Draft>({
    title: note.title,
    body: note.body,
    color: note.color,
    pinned: note.pinned,
  });
  const [status, setStatus] = useState<Status>('idle');
  const lastSaved = useRef<Draft>(draft);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const timer = useRef<number | undefined>(undefined);
  // Set after a failed save so a second Done/Escape can still close (discarding).
  const closeDespiteError = useRef(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(bodyRef, draft.body, 160);

  /** Sends whatever differs from the last successful save. Resolves false if the save failed. */
  const flush = useCallback(async (): Promise<boolean> => {
    window.clearTimeout(timer.current);
    const current = draftRef.current;
    const prev = lastSaved.current;
    const patch: NoteInput = {};
    if (current.title !== prev.title) patch.title = current.title;
    if (current.body !== prev.body) patch.body = current.body;
    if (current.color !== prev.color) patch.color = current.color;
    if (current.pinned !== prev.pinned) patch.pinned = current.pinned;
    if (Object.keys(patch).length === 0) return true;

    setStatus('saving');
    try {
      await onSave(note.id, patch);
      lastSaved.current = current;
      // Typing may have continued while the request was in flight.
      setStatus(draftRef.current === current ? 'saved' : 'dirty');
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }, [note.id, onSave]);

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setStatus('dirty');
    closeDespiteError.current = false;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
  }

  /**
   * Save, then close. If the save fails the sheet stays open with the error
   * shown, so an edit is never dropped silently; closing again discards it.
   */
  async function close() {
    const saved = await flush();
    if (saved || closeDespiteError.current) {
      onClose();
      return;
    }
    closeDespiteError.current = true;
  }

  // Escape closes (and saves) from anywhere in the sheet.
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        void closeRef.current();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer.current);
    };
  }, []);

  // Land the caret at the end of the text, where the user most likely wants to add.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const pinLabel = draft.pinned ? t('notes.unpin') : t('notes.pin');

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => void close()} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t('notes.editNote')}
        className={cn(
          'relative z-10 flex max-h-[85vh] w-full max-w-xl flex-col rounded-glass border border-fg/10 shadow-pop transition-colors duration-200',
          PAPER[draft.color],
        )}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <span aria-hidden className={cn('h-1.5 w-12 rounded-full', INK_BG[draft.color])} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => update({ pinned: !draft.pinned })}
              aria-pressed={draft.pinned}
              aria-label={pinLabel}
              title={pinLabel}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-fg/[0.06]',
                draft.pinned ? INK_TEXT[draft.color] : 'text-fg-muted',
              )}
            >
              <Pin className="h-[18px] w-[18px]" strokeWidth={1.75} fill={draft.pinned ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={() => void close()}
              aria-label={t('common.close')}
              title={t('common.close')}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-3">
          <input
            dir="auto"
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder={t('notes.titlePlaceholder')}
            className="w-full bg-transparent text-lg font-semibold text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <textarea
            ref={bodyRef}
            dir="auto"
            value={draft.body}
            onChange={(e) => update({ body: e.target.value })}
            onKeyDown={(e) => checklistKeyDown(e, (body) => update({ body }))}
            placeholder={t('notes.bodyPlaceholder')}
            className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-fg/10 px-5 py-3">
          <div className="flex items-center gap-3">
            <ColorSwatches value={draft.color} onChange={(color) => update({ color })} />
            <button
              type="button"
              onClick={() => insertChecklistItem(bodyRef.current, draft.body, (body) => update({ body }))}
              aria-label={t('notes.addChecklist')}
              title={t('notes.addChecklist')}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg max-md:h-9 max-md:w-9"
            >
              <ListChecks className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <SaveStatus status={status} editedWhen={formatRelative(LANGUAGES[lang].locale, note.updatedAt)} />
            <button
              type="button"
              onClick={() => onRequestDelete(note)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              {t('common.delete')}
            </button>
            <GlassButton type="button" onClick={() => void close()}>
              {t('notes.done')}
            </GlassButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SaveStatus({ status, editedWhen }: { status: Status; editedWhen: string }) {
  const { t } = useI18n();
  const base = 'inline-flex items-center gap-1.5 text-[12px]';
  switch (status) {
    case 'saving':
      return (
        <span role="status" className={cn(base, 'text-fg-muted')}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          {t('notes.saving')}
        </span>
      );
    case 'saved':
      return (
        <span role="status" className={cn(base, 'text-success')}>
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          {t('notes.saved')}
        </span>
      );
    case 'dirty':
      return (
        <span role="status" className={cn(base, 'text-fg-subtle')}>
          {t('notes.unsaved')}
        </span>
      );
    case 'error':
      return (
        <span role="alert" className={cn(base, 'text-danger')}>
          <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />
          {t('notes.saveError')}
        </span>
      );
    default:
      return <span className={cn(base, 'text-fg-subtle')}>{t('notes.edited', { when: editedWhen })}</span>;
  }
}
