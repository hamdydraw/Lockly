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
import { api, ApiError } from '../lib/api';
import { previewKind } from '../lib/preview';
import type { FileMeta } from '../lib/types';

/** Must match the multer limit in server/src/routes/files.ts. */
const MAX_FILE_MB = 10;

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Maps a filename to a human label + line icon for the file-list row. */
function fileKind(name: string): { label: string; Icon: LucideIcon } {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'xls':
    case 'xlsx':
    case 'csv':
      return { label: 'Excel spreadsheet', Icon: FileSpreadsheet };
    case 'doc':
    case 'docx':
      return { label: 'Word document', Icon: FileText };
    case 'pdf':
      return { label: 'PDF document', Icon: FileText };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return { label: 'Image', Icon: FileImage };
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return { label: 'Archive', Icon: FileArchive };
    case 'txt':
    case 'md':
      return { label: 'Text file', Icon: FileText };
    default:
      return { label: 'File', Icon: FileIcon };
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
          (onDelete ? 'pr-1.5' : '')
        }
      >
        <Icon className={active ? 'h-3.5 w-3.5 text-accent-fg' : 'h-3.5 w-3.5'} strokeWidth={2} />
        <span dir="auto" className="max-w-[160px] truncate">
          {children}
        </span>
        {count !== undefined && (
          <span className={active ? 'text-[11px] text-accent-fg' : 'text-[11px] text-fg-subtle'}>
            {count}
          </span>
        )}
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          // Always reachable by keyboard; revealed on hover or while selected.
          className={
            'mr-1 flex h-6 w-6 items-center justify-center rounded-md text-fg-muted transition hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 group-hover:opacity-100 ' +
            (active ? 'opacity-100' : 'opacity-0')
          }
          aria-label={`Delete folder ${children}`}
          title="Delete folder"
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
  error?: string;
}

/** Progress row shown above the file list while an upload is in flight. */
function UploadRow({ upload, onDismiss }: { upload: Upload; onDismiss: () => void }) {
  const failed = upload.error !== undefined;
  const percent = Math.round(upload.progress * 100);

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
              ? `Encrypting on the server… · ${humanSize(upload.size)}`
              : `Uploading ${percent}% · ${humanSize(upload.size)}`}
        </p>
        {!failed && (
          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-fg/[0.06]"
            role="progressbar"
            aria-label={`Uploading ${upload.name}`}
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
          aria-label="Dismiss"
          title="Dismiss"
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
      toast(`${file.name} uploaded & encrypted`, 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Upload failed';
      patch({ error: message, encrypting: false });
      toast(message, 'error');
    }
  }

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteFile(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['files'] });
      toast('File deleted', 'success');
      setDeleting(null);
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Delete failed', 'error'),
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
          ? `Deleted “${vars.folder}” and ${res.count} ${res.count === 1 ? 'file' : 'files'}`
          : `Deleted “${vars.folder}”; ${res.count} ${res.count === 1 ? 'file is' : 'files are'} now unfiled`,
        'success',
      );
      setDeletingFolder(null);
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : 'Could not delete the folder', 'error'),
  });

  const move = useMutation({
    mutationFn: ({ id, folder }: { id: string; folder: string | null }) => api.moveFile(id, folder),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ['files'] });
      toast(vars.folder ? `Moved to ${vars.folder}` : 'Removed from folder', 'success');
      setMoving(null);
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Move failed', 'error'),
  });

  function handleFiles(list: FileList | null) {
    if (!list) return;
    // The folder is captured now, so switching folders mid-upload cannot move it.
    const folder = selected;
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast(`${f.name} is larger than ${MAX_FILE_MB} MB`, 'error');
        continue;
      }
      void startUpload(f, folder);
    }
  }

  async function download(f: FileMeta) {
    try {
      await api.downloadFile(f.id, f.filename);
    } catch {
      toast('Download failed', 'error');
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
  const subtitle = `${count} ${count === 1 ? 'file' : 'files'} · ${humanSize(totalBytes)}`;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-fg">
            Secure files
          </h1>
          <p className="mt-1 text-[13px] text-fg-muted">
            {selected ? `${selected} · ${subtitle}` : subtitle}
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-fg-on-accent transition-colors duration-150 hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {activeUploads > 0 ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              Uploading {activeUploads}…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" strokeWidth={2} />
              Upload files
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
          All files
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
          New folder
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
            {selected ? `Drop files here to add to “${selected}”` : 'Drop files here or browse'}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">Encrypted · Max {MAX_FILE_MB} MB</p>
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
        <p className="text-sm text-fg-muted">Loading…</p>
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
            {selected ? `“${selected}” is empty` : 'No files yet'}
          </p>
          <p className="mt-1 text-[13px] text-fg-muted">
            {selected
              ? 'Upload a file while this folder is selected, or move one here.'
              : 'Upload a file to store it encrypted at rest.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map((f) => {
            const { label, Icon } = fileKind(f.filename);
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
                        className="min-w-0 truncate text-left text-sm font-medium text-fg hover:text-accent-fg focus-visible:outline-none focus-visible:underline"
                        title="Preview"
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
                      Encrypted
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-fg-muted">
                    <span className="truncate">
                      {label} · {humanSize(f.sizeBytes)}
                    </span>
                    {f.folder && selected === null && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-fg/[0.03] px-1.5 py-0.5 text-[11px]">
                        <Folder className="h-3 w-3" strokeWidth={2} />
                        {f.folder}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                  {canPreview && (
                    <button
                      onClick={() => setPreviewing(f)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40"
                      aria-label="Preview"
                      title="Preview"
                    >
                      <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </button>
                  )}
                  <button
                    onClick={() => openMove(f)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40"
                    aria-label="Move to folder"
                    title="Move to folder"
                  >
                    <FolderInput className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => download(f)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40"
                    aria-label="Download"
                    title="Download"
                  >
                    <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => setDeleting(f)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                    aria-label="Delete"
                    title="Delete"
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
        title="Delete file?"
        body={
          <>
            <span dir="auto" className="font-medium text-fg">
              {deleting?.filename}
            </span>{' '}
            ({deleting ? humanSize(deleting.sizeBytes) : ''}) will be permanently deleted from the
            server. This cannot be undone.
          </>
        }
        confirm={{
          label: 'Delete file',
          busy: remove.isPending,
          onClick: () => deleting && remove.mutate(deleting.id),
        }}
      />

      {/* Delete a folder */}
      <ConfirmModal
        open={deletingFolder !== null}
        onClose={() => setDeletingFolder(null)}
        title="Delete folder?"
        body={
          <>
            “
            <span dir="auto" className="font-medium text-fg">
              {deletingFolder}
            </span>
            ” holds {deletingFolderCount} {deletingFolderCount === 1 ? 'file' : 'files'}. Delete
            them along with the folder, or keep them — kept files stay encrypted and move to{' '}
            <span className="font-medium text-fg">All files</span>.
          </>
        }
        secondary={{
          label: 'Keep the files',
          busy: removeFolder.isPending && removeFolder.variables?.deleteFiles === false,
          onClick: () =>
            deletingFolder && removeFolder.mutate({ folder: deletingFolder, deleteFiles: false }),
        }}
        confirm={{
          label: `Delete folder & ${deletingFolderCount} ${deletingFolderCount === 1 ? 'file' : 'files'}`,
          busy: removeFolder.isPending && removeFolder.variables?.deleteFiles === true,
          onClick: () =>
            deletingFolder && removeFolder.mutate({ folder: deletingFolder, deleteFiles: true }),
        }}
      />

      {/* New folder */}
      <GlassModal open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="New folder">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createFolder();
          }}
          className="space-y-4"
        >
          <GlassInput
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. Documents"
            maxLength={100}
            autoFocus
          />
          <p className="text-[13px] text-fg-muted">
            Files you upload while this folder is selected are placed in it. A folder disappears
            once it has no files.
          </p>
          <div className="flex justify-end gap-2">
            <GlassButton type="button" variant="ghost" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" disabled={!newFolderName.trim()}>
              Create
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Move to folder */}
      <GlassModal open={moving !== null} onClose={() => setMoving(null)} title="Move to folder">
        {moving && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              move.mutate({ id: moving.id, folder: moveTarget.trim() || null });
            }}
            className="space-y-4"
          >
            <p className="truncate text-sm text-fg-muted">{moving.filename}</p>
            {folders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <FolderChip active={moveTarget === ''} onClick={() => setMoveTarget('')} icon={Files}>
                  No folder
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
              label={folders.length > 0 ? 'Or type a folder name' : 'Folder name'}
              value={moveTarget}
              onChange={(e) => setMoveTarget(e.target.value)}
              placeholder="e.g. Documents"
              maxLength={100}
            />
            <div className="flex justify-end gap-2">
              <GlassButton type="button" variant="ghost" onClick={() => setMoving(null)}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" disabled={move.isPending}>
                {move.isPending ? 'Moving…' : 'Move'}
              </GlassButton>
            </div>
          </form>
        )}
      </GlassModal>
    </div>
  );
}
