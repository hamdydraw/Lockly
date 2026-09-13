import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Download,
  Eye,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  Files,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { FilePreview } from '../components/FilePreview';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassInput } from '../components/ui/GlassInput';
import { GlassModal } from '../components/ui/GlassModal';
import { useToast } from '../components/ui/Toast';
import { useErrorText } from '../i18n/errors';
import { useI18n } from '../i18n/LanguageProvider';
import { api } from '../lib/api';
import { previewKind } from '../lib/preview';
import type { FileMeta } from '../lib/types';

/** Must match the multer limit in server/src/routes/files.ts. */
const MAX_FILE_MB = 10;

type FileKind = 'excel' | 'word' | 'pdf' | 'image' | 'archive' | 'text' | 'file';

/** Maps a filename to a label key + line icon for the file-list row. */
function fileKind(name: string): { kind: FileKind; Icon: LucideIcon } {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'xls':
    case 'xlsx':
    case 'csv':
      return { kind: 'excel', Icon: FileSpreadsheet };
    case 'doc':
    case 'docx':
      return { kind: 'word', Icon: FileText };
    case 'pdf':
      return { kind: 'pdf', Icon: FileText };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return { kind: 'image', Icon: FileImage };
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return { kind: 'archive', Icon: FileArchive };
    case 'txt':
    case 'md':
      return { kind: 'text', Icon: FileText };
    default:
      return { kind: 'file', Icon: FileIcon };
  }
}

/**
 * Folder chip in the filter row. With `onDelete` it becomes a two-control chip
 * (select / delete) rather than one button, since a button cannot nest a button.
 */
function FolderChip({
  active,
  onClick,
  onDelete,
  icon: Icon,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
  icon: LucideIcon;
  children: string;
  count?: number;
}) {
  const { t, formatNumber } = useI18n();
  return (
    <div
      className={
        'group inline-flex shrink-0 items-center rounded-lg border text-[13px] font-medium transition-colors duration-150 ' +
        (active
          ? 'border-accent-fg/40 bg-accent/10 text-fg'
          : 'border-line bg-surface-2 text-fg-muted hover:bg-surface-3 hover:text-fg')
      }
    >
      <button
        onClick={onClick}
        className={
          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40 ' +
          (onDelete ? 'pe-1.5' : '')
        }
      >
        <Icon className={active ? 'h-3.5 w-3.5 text-accent-fg' : 'h-3.5 w-3.5'} strokeWidth={2} />
        <span dir="auto" className="max-w-[160px] truncate">
          {children}
        </span>
        {count !== undefined && (
          <span className={active ? 'text-[11px] text-accent-fg' : 'text-[11px] text-fg-subtle'}>
            {formatNumber(count)}
          </span>
        )}
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          // Always reachable by keyboard; revealed on hover or while selected.
          className={
            'me-1 flex h-6 w-6 items-center justify-center rounded-md text-fg-muted transition hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 group-hover:opacity-100 ' +
            (active ? 'opacity-100' : 'opacity-0')
          }
          aria-label={t('files.deleteFolderLabel', { name: children })}
          title={t('files.deleteFolder')}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

/** One in-flight (or failed) upload, tracked only for the duration of the page. */
interface Upload {
  id: string;
  name: string;
  size: number;
  /** Fraction of bytes sent, 0–1. */
  progress: number;
  /** Bytes are all sent; the server is sealing and storing them. */
  encrypting?: boolean;
  /** Already translated when the upload failed. */
  error?: string;
}

/** Progress row shown above the file list while an upload is in flight. */
function UploadRow({ upload, onDismiss }: { upload: Upload; onDismiss: () => void }) {
  const { t, formatBytes } = useI18n();
  const failed = upload.error !== undefined;
  const percent = Math.round(upload.progress * 100);
  const size = formatBytes(upload.size);

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-fg/[0.03]">
        {failed ? (
          <AlertCircle className="h-5 w-5 text-danger" strokeWidth={1.75} />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-secure" strokeWidth={1.75} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p dir="auto" className="truncate text-sm font-medium text-fg">
          {upload.name}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-fg-muted">
          {failed
            ? upload.error
            : upload.encrypting
              ? t('files.encryptingOnServer', { size })
              : t('files.uploadingPercent', { percent, size })}
        </p>
        {!failed && (
          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-fg/[0.06]"
            role="progressbar"
            aria-label={t('files.uploadingAria', { name: upload.name })}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={
                'h-full rounded-full bg-secure transition-[width] duration-200 ease-out ' +
                // The server-side encrypt has no progress to report, so the full
                // bar pulses instead of sitting still at 100%.
                (upload.encrypting ? 'animate-pulse' : '')
              }
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      {failed && (
        <button
          onClick={onDismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40"
          aria-label={t('common.dismiss')}
          title={t('common.dismiss')}
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export function FilesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { t, tx, plural, pluralx, formatBytes } = useI18n();
  const errorText = useErrorText();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // null = "All files". Folders are labels on files (one level, like vault items);
  // `extraFolders` keeps a freshly created, still-empty folder visible until it has a file.
  const [selected, setSelected] = useState<string | null>(null);
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moving, setMoving] = useState<FileMeta | null>(null);
  const [moveTarget, setMoveTarget] = useState('');
  const [previewing, setPreviewing] = useState<FileMeta | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [deleting, setDeleting] = useState<FileMeta | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<string | null>(null);

  const { data: files, isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: () => api.listFiles(),
  });

  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of files ?? []) if (f.folder) counts.set(f.folder, (counts.get(f.folder) ?? 0) + 1);
    for (const name of extraFolders) if (!counts.has(name)) counts.set(name, 0);
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }));
  }, [files, extraFolders]);

  const visible = useMemo(
    () => (selected === null ? files ?? [] : (files ?? []).filter((f) => f.folder === selected)),
    [files, selected],
  );

  // What the viewer can page through: the previewable files of the folder on
  // screen, in list order, so next/previous matches what the user sees behind it.
  const previewable = useMemo(
    () => visible.filter((f) => previewKind(f.filename, f.mimeType) !== null),
    [visible],
  );

  /**
   * Uploads run in parallel and each gets its own row above the list, so the
   * user can see which file is still going. A failed row sticks around with its
   * message until dismissed; a finished one disappears as the list refreshes.
   */
  async function startUpload(file: File, folder: string | null) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const patch = (next: Partial<Upload>) =>
      setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...next } : u)));

    setUploads((prev) => [...prev, { id, name: file.name, size: file.size, progress: 0 }]);
    try {
      await api.uploadFile(file, folder, (fraction) =>
        // At 100% the bytes are sent but the server is still encrypting them.
        patch(fraction >= 1 ? { progress: 1, encrypting: true } : { progress: fraction }),
      );
      setUploads((prev) => prev.filter((u) => u.id !== id));
      await qc.invalidateQueries({ queryKey: ['files'] });
      toast(t('files.uploadedToast', { name: file.name }), 'success');
    } catch (err) {
      const message = errorText(err, 'errors.uploadFailed');
      patch({ error: message, encrypting: false });
      toast(message, 'error');
    }
  }

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteFile(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['files'] });
      toast(t('files.fileDeleted'), 'success');
      setDeleting(null);
    },
    onError: (err) => toast(errorText(err, 'errors.deleteFailed'), 'error'),
  });

  // `deleteFiles` distinguishes "delete the folder and everything in it" from
  // "drop the label and leave the files unfiled".
  const removeFolder = useMutation({
    mutationFn: ({ folder, deleteFiles }: { folder: string; deleteFiles: boolean }) =>
      api.deleteFolder(folder, deleteFiles),
    onSuccess: async (res, vars) => {
      await qc.invalidateQueries({ queryKey: ['files'] });
      setExtraFolders((prev) => prev.filter((n) => n !== vars.folder));
      if (selected === vars.folder) setSelected(null);
      toast(
        vars.deleteFiles
          ? plural('files.folderDeletedWithFiles', res.count, { folder: vars.folder })
          : plural('files.folderDeletedKeptFiles', res.count, { folder: vars.folder }),
        'success',
      );
      setDeletingFolder(null);
    },
    onError: (err) => toast(errorText(err, 'errors.folderDeleteFailed'), 'error'),
  });

  const move = useMutation({
    mutationFn: ({ id, folder }: { id: string; folder: string | null }) => api.moveFile(id, folder),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['files'] });
      toast(
        vars.folder ? t('files.movedTo', { folder: vars.folder }) : t('files.removedFromFolder'),
        'success',
      );
      setMoving(null);
    },
    onError: (err) => toast(errorText(err, 'errors.moveFailed'), 'error'),
  });

  function handleFiles(list: FileList | null) {
    if (!list) return;
    // The folder is captured now, so switching folders mid-upload cannot move it.
    const folder = selected;
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast(t('errors.fileTooLarge', { name: f.name, max: MAX_FILE_MB }), 'error');
        continue;
      }
      void startUpload(f, folder);
    }
  }

  async function download(f: FileMeta) {
    try {
      await api.downloadFile(f.id, f.filename);
    } catch (err) {
      toast(errorText(err, 'errors.downloadFailed'), 'error');
    }
  }

  function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    if (!folders.some((f) => f.name === name)) setExtraFolders((prev) => [...prev, name]);
    setSelected(name);
    setNewFolderName('');
    setNewFolderOpen(false);
  }

  function openMove(f: FileMeta) {
    setMoveTarget(f.folder ?? '');
    setMoving(f);
  }

  const activeUploads = uploads.filter((u) => u.error === undefined).length;
  const deletingFolderCount = folders.find((f) => f.name === deletingFolder)?.count ?? 0;
  const count = visible.length;
  const totalBytes = visible.reduce((sum, f) => sum + f.sizeBytes, 0);
  const summary = plural('files.summary', count, { size: formatBytes(totalBytes) });

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-fg">
            {t('files.title')}
          </h1>
          <p className="mt-1 text-[13px] text-fg-muted">
            {selected ? tx('files.folderSummary', { folder: selected, summary }) : summary}
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-fg-on-accent transition-colors duration-150 hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {activeUploads > 0 ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              {plural('files.uploading', activeUploads)}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" strokeWidth={2} />
              {t('files.uploadFiles')}
            </>
          )}
        </button>
      </header>

      {/* Folder chips */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FolderChip
          active={selected === null}
          onClick={() => setSelected(null)}
          icon={Files}
          count={files?.length ?? 0}
        >
          {t('files.allFiles')}
        </FolderChip>
        {folders.map((f) => (
          <FolderChip
            key={f.name}
            active={selected === f.name}
            onClick={() => setSelected(f.name)}
            onDelete={() => setDeletingFolder(f.name)}
            icon={Folder}
            count={f.count}
          >
            {f.name}
          </FolderChip>
        ))}
        <button
          onClick={() => setNewFolderOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:border-accent-fg/50 hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40"
        >
          <FolderPlus className="h-3.5 w-3.5" strokeWidth={2} />
          {t('files.newFolder')}
        </button>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={
          'mb-8 flex h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center transition-colors duration-150 ' +
          (dragOver
            ? 'border-accent-fg bg-accent/10'
            : 'border-line bg-fg/[0.02] hover:border-accent-fg/50 hover:bg-accent/[0.04]')
        }
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2">
          <Upload
            className={dragOver ? 'h-[18px] w-[18px] text-accent-fg' : 'h-[18px] w-[18px] text-fg-muted'}
            strokeWidth={1.75}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-fg">
            {selected ? tx('files.dropInto', { folder: selected }) : t('files.dropHere')}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">{t('files.dropHint', { max: MAX_FILE_MB })}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
      </div>

      {/* In-flight uploads */}
      {uploads.length > 0 && (
        <div className="mb-1.5 space-y-1.5">
          {uploads.map((u) => (
            <UploadRow
              key={u.id}
              upload={u}
              onDismiss={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))}
            />
          ))}
        </div>
      )}

      {/* File list */}
      {isLoading ? (
        <p className="text-sm text-fg-muted">{t('app.loading')}</p>
      ) : visible.length === 0 && uploads.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-fg/[0.03]">
            {selected ? (
              <Folder className="h-5 w-5 text-fg-muted" strokeWidth={1.75} />
            ) : (
              <FileIcon className="h-5 w-5 text-fg-muted" strokeWidth={1.75} />
            )}
          </div>
          <p className="text-sm font-medium text-fg">
            {selected ? tx('files.emptyFolder', { folder: selected }) : t('files.empty')}
          </p>
          <p className="mt-1 text-[13px] text-fg-muted">
            {selected ? t('files.emptyFolderHint') : t('files.emptyHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map((f) => {
            const { kind, Icon } = fileKind(f.filename);
            const canPreview = previewKind(f.filename, f.mimeType) !== null;
            return (
              <div
                key={f.id}
                className="group flex items-center gap-3.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3 transition-colors duration-150 hover:bg-surface-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-fg/[0.03]">
                  <Icon className="h-5 w-5 text-accent-fg" strokeWidth={1.75} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {canPreview ? (
                      // dir="auto" so an Arabic or Hebrew name reads right-to-left.
                      <button
                        dir="auto"
                        onClick={() => setPreviewing(f)}
                        className="min-w-0 truncate text-start text-sm font-medium text-fg hover:text-accent-fg focus-visible:outline-none focus-visible:underline"
                        title={t('common.preview')}
                      >
                        {f.filename}
                      </button>
                    ) : (
                      <p dir="auto" className="truncate text-sm font-medium text-fg">
                        {f.filename}
                      </p>
                    )}
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-secure/25 bg-secure/10 px-1.5 py-0.5 text-[11px] font-medium text-secure">
                      <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                      {t('files.encrypted')}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-fg-muted">
                    <span className="truncate">
                      {t(`files.kinds.${kind}`)} · {formatBytes(f.sizeBytes)}
                    </span>
                    {f.folder && selected === null && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-fg/[0.03] px-1.5 py-0.5 text-[11px]">
                        <Folder className="h-3 w-3" strokeWidth={2} />
                        <span dir="auto">{f.folder}</span>
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                  {canPreview && (
                    <button
                      onClick={() => setPreviewing(f)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40"
                      aria-label={t('common.preview')}
                      title={t('common.preview')}
                    >
                      <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </button>
                  )}
                  <button
                    onClick={() => openMove(f)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40"
                    aria-label={t('files.moveToFolder')}
                    title={t('files.moveToFolder')}
                  >
                    <FolderInput className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => download(f)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40"
                    aria-label={t('common.download')}
                    title={t('common.download')}
                  >
                    <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => setDeleting(f)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                    aria-label={t('common.delete')}
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-app viewer */}
      <FilePreview
        file={previewing}
        onClose={() => setPreviewing(null)}
        siblings={previewable}
        onNavigate={setPreviewing}
      />

      {/* Delete a file */}
      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('files.deleteFileTitle')}
        body={tx('files.deleteFileBody', {
          name: (
            <span dir="auto" className="font-medium text-fg">
              {deleting?.filename}
            </span>
          ),
          size: deleting ? formatBytes(deleting.sizeBytes) : '',
        })}
        confirm={{
          label: t('files.deleteFileConfirm'),
          busy: remove.isPending,
          onClick: () => deleting && remove.mutate(deleting.id),
        }}
      />

      {/* Delete a folder */}
      <ConfirmModal
        open={deletingFolder !== null}
        onClose={() => setDeletingFolder(null)}
        title={t('files.deleteFolderTitle')}
        body={pluralx('files.deleteFolderBody', deletingFolderCount, {
          name: (
            <span dir="auto" className="font-medium text-fg">
              {deletingFolder}
            </span>
          ),
          allFiles: <span className="font-medium text-fg">{t('files.allFiles')}</span>,
        })}
        secondary={{
          label: t('files.keepFiles'),
          busy: removeFolder.isPending && removeFolder.variables?.deleteFiles === false,
          onClick: () =>
            deletingFolder && removeFolder.mutate({ folder: deletingFolder, deleteFiles: false }),
        }}
        confirm={{
          label: plural('files.deleteFolderConfirm', deletingFolderCount),
          busy: removeFolder.isPending && removeFolder.variables?.deleteFiles === true,
          onClick: () =>
            deletingFolder && removeFolder.mutate({ folder: deletingFolder, deleteFiles: true }),
        }}
      />

      {/* New folder */}
      <GlassModal open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title={t('files.newFolder')}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createFolder();
          }}
          className="space-y-4"
        >
          <GlassInput
            label={t('files.folderName')}
            dir="auto"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t('files.folderNamePlaceholder')}
            maxLength={100}
            autoFocus
          />
          <p className="text-[13px] text-fg-muted">{t('files.newFolderHint')}</p>
          <div className="flex justify-end gap-2">
            <GlassButton type="button" variant="ghost" onClick={() => setNewFolderOpen(false)}>
              {t('common.cancel')}
            </GlassButton>
            <GlassButton type="submit" disabled={!newFolderName.trim()}>
              {t('common.create')}
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Move to folder */}
      <GlassModal open={moving !== null} onClose={() => setMoving(null)} title={t('files.moveToFolder')}>
        {moving && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              move.mutate({ id: moving.id, folder: moveTarget.trim() || null });
            }}
            className="space-y-4"
          >
            <p dir="auto" className="truncate text-sm text-fg-muted">
              {moving.filename}
            </p>
            {folders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <FolderChip active={moveTarget === ''} onClick={() => setMoveTarget('')} icon={Files}>
                  {t('files.noFolder')}
                </FolderChip>
                {folders.map((f) => (
                  <FolderChip
                    key={f.name}
                    active={moveTarget === f.name}
                    onClick={() => setMoveTarget(f.name)}
                    icon={Folder}
                  >
                    {f.name}
                  </FolderChip>
                ))}
              </div>
            )}
            <GlassInput
              label={folders.length > 0 ? t('files.orTypeFolder') : t('files.folderName')}
              dir="auto"
              value={moveTarget}
              onChange={(e) => setMoveTarget(e.target.value)}
              placeholder={t('files.folderNamePlaceholder')}
              maxLength={100}
            />
            <div className="flex justify-end gap-2">
              <GlassButton type="button" variant="ghost" onClick={() => setMoving(null)}>
                {t('common.cancel')}
              </GlassButton>
              <GlassButton type="submit" disabled={move.isPending}>
                {move.isPending ? t('common.moving') : t('common.move')}
              </GlassButton>
            </div>
          </form>
        )}
      </GlassModal>
    </div>
  );
}
