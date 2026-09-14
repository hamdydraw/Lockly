import { ListChecks, Pin, StickyNote } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { INK_BG, INK_TEXT, NOTE_COLORS, PAPER } from '../../lib/notes';
import type { NoteColor, NoteInput } from '../../lib/types';
import { cn } from '../ui/cn';
import { GlassButton } from '../ui/GlassButton';
import { ColorSwatches } from './ColorSwatches';
import { checklistKeyDown, insertChecklistItem, useAutoGrow } from './textarea';

export interface NoteComposerHandle {
  /** Expand the composer and focus the body — used by "New note" and the empty state. */
  open: () => void;
}

interface Props {
  onCreate: (input: Required<NoteInput>) => Promise<unknown>;
  className?: string;
}

/**
 * Quick capture. Collapsed it is a one-line "Take a note…" bar; expanded it is a
 * sticky in the chosen colour. Clicking anywhere else, or pressing Escape, saves
 * whatever was written and collapses again — a note is never lost by tapping away.
 */
export const NoteComposer = forwardRef<NoteComposerHandle, Props>(function NoteComposer(
  { onCreate, className },
  ref,
) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState<NoteColor>('amber');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(bodyRef, body, 72);

  const hasContent = title.trim() !== '' || body.trim() !== '';

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      rootRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
  }));

  function reset() {
    setTitle('');
    setBody('');
    setColor('amber');
    setPinned(false);
    setOpen(false);
  }

  async function commit() {
    if (saving) return;
    if (!hasContent) {
      reset();
      return;
    }
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), body: body.replace(/\s+$/, ''), color, pinned });
      reset();
    } catch {
      // The page already toasted the error; keep the draft so nothing is lost.
    } finally {
      setSaving(false);
    }
  }

  // Latest commit() for the document listener, without re-subscribing on every keystroke.
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) void commitRef.current();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const pinLabel = pinned ? t('notes.unpin') : t('notes.pin');

  return (
    <div
      ref={rootRef}
      className={cn(
        'rounded-glass border transition-colors duration-200',
        open ? cn('border-fg/10 shadow-pop', PAPER[color]) : 'border-line bg-surface-2 shadow-raised',
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          void commit();
        }
      }}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-glass px-4 py-3 text-start text-sm text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg-muted"
        >
          <StickyNote className="h-[18px] w-[18px] text-accent-fg" strokeWidth={1.75} />
          <span className="flex-1">{t('notes.takeANote')}</span>
          <span aria-hidden className="flex items-center gap-1">
            {NOTE_COLORS.map((c) => (
              <span key={c} className={cn('h-2 w-2 rounded-full opacity-70', INK_BG[c])} />
            ))}
          </span>
        </button>
      ) : (
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span aria-hidden className={cn('h-1.5 w-10 shrink-0 rounded-full', INK_BG[color])} />
            <input
              dir="auto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('notes.titlePlaceholder')}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setPinned((p) => !p)}
              aria-pressed={pinned}
              aria-label={pinLabel}
              title={pinLabel}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-fg/[0.06]',
                pinned ? INK_TEXT[color] : 'text-fg-muted',
              )}
            >
              <Pin className="h-4 w-4" strokeWidth={1.75} fill={pinned ? 'currentColor' : 'none'} />
            </button>
          </div>
          <textarea
            ref={bodyRef}
            autoFocus
            dir="auto"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => checklistKeyDown(e, setBody)}
            rows={3}
            placeholder={t('notes.bodyPlaceholder')}
            className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ColorSwatches value={color} onChange={setColor} />
              <button
                type="button"
                onClick={() => insertChecklistItem(bodyRef.current, body, setBody)}
                aria-label={t('notes.addChecklist')}
                title={t('notes.addChecklist')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg max-md:h-9 max-md:w-9"
              >
                <ListChecks className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[12px] text-fg-subtle sm:inline">{t('notes.saveHint')}</span>
              <button
                type="button"
                onClick={reset}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
              >
                {t('notes.discard')}
              </button>
              <GlassButton type="button" onClick={() => void commit()} disabled={saving || !hasContent}>
                {saving ? t('common.saving') : t('common.save')}
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
