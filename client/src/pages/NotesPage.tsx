import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, Search } from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { NoteCard } from '../components/notes/NoteCard';
import { NoteComposer, type NoteComposerHandle } from '../components/notes/NoteComposer';
import { NoteEditor } from '../components/notes/NoteEditor';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassCard } from '../components/ui/GlassCard';
import { useToast } from '../components/ui/Toast';
import { cn } from '../components/ui/cn';
import { useErrorText } from '../i18n/errors';
import { useI18n } from '../i18n/LanguageProvider';
import { api } from '../lib/api';
import { copyText } from '../lib/clipboard';
import { byBoardOrder, matchesQuery, PAPER, toggleLine } from '../lib/notes';
import type { Note, NoteInput } from '../lib/types';

const NOTES_KEY = ['notes'] as const;

/**
 * Sticky-notes board. Every note arrives decrypted, so search runs locally over
 * titles and bodies, and pins, checklists and edits apply optimistically.
 */
export function NotesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { t, tx, plural } = useI18n();
  const errorText = useErrorText();
  const composer = useRef<NoteComposerHandle>(null);
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

  const { data: notes, isLoading, isError, refetch } = useQuery({
    queryKey: NOTES_KEY,
    queryFn: () => api.listNotes(),
  });

  const editing = notes?.find((n) => n.id === editingId) ?? null;

  const visible = useMemo(
    () => (notes ?? []).filter((n) => matchesQuery(n, q)).sort(byBoardOrder),
    [notes, q],
  );
  const pinned = visible.filter((n) => n.pinned);
  const others = visible.filter((n) => !n.pinned);

  const setCache = (fn: (old: Note[]) => Note[]) =>
    qc.setQueryData<Note[]>(NOTES_KEY, (old) => fn(old ?? []));

  const create = useMutation({
    mutationFn: (input: NoteInput) => api.createNote(input),
    onSuccess: (note) => {
      setCache((old) => [note, ...old]);
      toast(t('notes.created'), 'success');
    },
    onError: (err) => toast(errorText(err, 'errors.saveFailed'), 'error'),
  });

  /**
   * Optimistic patch: the board updates instantly and rolls back on failure.
   * `silent` skips the toast for the editor, which shows its own save status.
   */
  async function saveNote(id: string, patch: NoteInput, silent = false): Promise<Note> {
    const prev = qc.getQueryData<Note[]>(NOTES_KEY);
    setCache((old) =>
      old.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)),
    );
    try {
      const note = await api.updateNote(id, patch);
      setCache((old) => old.map((n) => (n.id === note.id ? note : n)));
      return note;
    } catch (err) {
      if (prev) qc.setQueryData(NOTES_KEY, prev);
      if (!silent) toast(errorText(err, 'errors.saveFailed'), 'error');
      throw err;
    }
  }

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: (_res, id) => {
      setCache((old) => old.filter((n) => n.id !== id));
      if (editingId === id) setEditingId(null);
      setDeleting(null);
      toast(t('notes.deleted'), 'success');
    },
    onError: (err) => toast(errorText(err, 'errors.deleteFailed'), 'error'),
  });

  async function copyNote(note: Note) {
    const ok = await copyText(note.body || note.title);
    toast(ok ? t('notes.copied') : t('errors.clipboard'), ok ? 'info' : 'error');
  }

  const card = (note: Note) => (
    <NoteCard
      key={note.id}
      note={note}
      onOpen={() => setEditingId(note.id)}
      onTogglePin={() => void saveNote(note.id, { pinned: !note.pinned }).catch(() => {})}
      onToggleCheck={(line) =>
        void saveNote(note.id, { body: toggleLine(note.body, line) }).catch(() => {})
      }
      onCopy={() => void copyNote(note)}
      onDelete={() => setDeleting(note)}
    />
  );

  return (
    // Room for the phone tab bar so the last row of stickies is never hidden behind it.
    <div className="pb-24 md:pb-0">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('notes.title')}</h1>
          {notes && notes.length > 0 && (
            <p className="mt-0.5 text-sm text-fg-muted">{plural('notes.count', notes.length)}</p>
          )}
        </div>
        <GlassButton onClick={() => composer.current?.open()}>
          <Plus className="h-4 w-4" />
          {t('notes.newNote')}
        </GlassButton>
      </div>

      <NoteComposer ref={composer} onCreate={(input) => create.mutateAsync(input)} className="mb-5" />

      {notes && notes.length > 0 && (
        <div className="relative mb-5">
          <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('notes.searchPlaceholder')}
            className="w-full rounded-xl border border-line-strong bg-surface-2 py-2.5 ps-10 pe-4 text-fg placeholder:text-fg-subtle focus:border-accent-fg focus:outline-none"
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-fg-muted">{t('app.loading')}</p>
      ) : isError ? (
        <GlassCard className="flex items-center gap-3.5">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger" strokeWidth={1.75} />
          <p className="flex-1 text-sm text-fg-muted">{t('notes.loadFailed')}</p>
          <GlassButton variant="ghost" onClick={() => void refetch()}>
            {t('common.retry')}
          </GlassButton>
        </GlassCard>
      ) : !notes || notes.length === 0 ? (
        <EmptyBoard onStart={() => composer.current?.open()} />
      ) : visible.length === 0 ? (
        <GlassCard className="text-center text-fg-muted">{tx('notes.noMatches', { q })}</GlassCard>
      ) : pinned.length === 0 ? (
        <Board>{others.map(card)}</Board>
      ) : (
        <>
          <SectionLabel>{t('notes.pinned')}</SectionLabel>
          <Board>{pinned.map(card)}</Board>
          {others.length > 0 && (
            <>
              <SectionLabel className="mt-6">{t('notes.others')}</SectionLabel>
              <Board>{others.map(card)}</Board>
            </>
          )}
        </>
      )}

      <NoteEditor
        note={editing}
        onClose={() => setEditingId(null)}
        onSave={(id, patch) => saveNote(id, patch, true)}
        onRequestDelete={setDeleting}
      />

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('notes.deleteTitle')}
        body={
          deleting && tx('notes.deleteBody', { title: deleting.title || t('notes.untitled') })
        }
        confirm={{
          label: t('notes.deleteConfirm'),
          onClick: () => deleting && remove.mutate(deleting.id),
          busy: remove.isPending,
        }}
      />
    </div>
  );
}

/** CSS-columns masonry: cards flow top-to-bottom, then across, with no measuring. */
function Board({ children }: { children: ReactNode }) {
  return <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">{children}</div>;
}

function SectionLabel({ children, className }: { children: string; className?: string }) {
  return (
    <h2 className={cn('mb-3 text-[12px] font-semibold uppercase tracking-wide text-fg-subtle', className)}>
      {children}
    </h2>
  );
}

/** First-run state: a small stack of stickies and one call to action. */
function EmptyBoard({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  return (
    <GlassCard className="flex flex-col items-center py-12 text-center">
      <div aria-hidden className="relative mb-6 h-28 w-48">
        <span
          className={cn(
            'absolute start-0 top-4 h-20 w-24 -rotate-12 rounded-xl border border-fg/10 shadow-raised',
            PAPER.sky,
          )}
        />
        <span
          className={cn(
            'absolute end-0 top-3 h-20 w-24 rotate-[10deg] rounded-xl border border-fg/10 shadow-raised',
            PAPER.rose,
          )}
        />
        <span
          className={cn(
            'absolute inset-x-12 top-0 flex h-20 -rotate-2 justify-center rounded-xl border border-fg/10 shadow-pop',
            PAPER.amber,
          )}
        >
          <span className="mt-2.5 block h-1.5 w-10 rounded-full bg-note-amber-ink" />
        </span>
      </div>
      <h2 className="text-lg font-semibold text-fg">{t('notes.emptyTitle')}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">{t('notes.emptyBody')}</p>
      <GlassButton className="mt-5" onClick={onStart}>
        <Plus className="h-4 w-4" />
        {t('notes.emptyAction')}
      </GlassButton>
    </GlassCard>
  );
}
