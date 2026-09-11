import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
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
  ShieldCheck,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { FilePreview } from '../components/FilePreview';
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

/** Folder chip in the filter row. */
function FolderChip({
  active,
  onClick,
  icon: Icon,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/40 ' +
        (active
          ? 'border-violet-glow/40 bg-violet-glow/[0.12] text-ink'
          : 'border-line bg-card text-muted hover:bg-card-hover hover:text-ink')
      }
    >
      <Icon className={active ? 'h-3.5 w-3.5 text-violet-glow' : 'h-3.5 w-3.5'} strokeWidth={2} />
      <span className="max-w-[160px] truncate">{children}</span>
      {count !== undefined && (
        <span className={active ? 'text-[11px] text-violet-glow' : 'text-[11px] text-muted/70'}>
          {count}
        </span>
      )}
    </button>
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

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadFile(file, selected),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['files'] });
      toast('File uploaded & encrypted', 'success');
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : 'Upload failed', 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteFile(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['files'] });
      toast('File deleted', 'success');
    },
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
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast(`${f.name} is larger than ${MAX_FILE_MB} MB`, 'error');
        continue;
      }
      upload.mutate(f);
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

  const count = visible.length;
  const totalBytes = visible.reduce((sum, f) => sum + f.sizeBytes, 0);
  const subtitle = `${count} ${count === 1 ? 'file' : 'files'} · ${humanSize(totalBytes)}`;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">
            Secure files
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {selected ? `${selected} · ${subtitle}` : subtitle}
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-glow px-3.5 py-2 text-sm font-medium text-[#0B0D17] transition-colors duration-150 hover:bg-[#7cebff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          <Upload className="h-4 w-4" strokeWidth={2} />
          Upload files
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
            icon={Folder}
            count={f.count}
          >
            {f.name}
          </FolderChip>
        ))}
        <button
          onClick={() => setNewFolderOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-[13px] font-medium text-muted transition-colors duration-150 hover:border-cyan-glow/50 hover:text-cyan-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/40"
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
            ? 'border-cyan-glow bg-cyan-glow/[0.06]'
            : 'border-line bg-white/[0.015] hover:border-cyan-glow/50 hover:bg-cyan-glow/[0.03]')
        }
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card">
          <Upload
            className={dragOver ? 'h-[18px] w-[18px] text-cyan-glow' : 'h-[18px] w-[18px] text-muted'}
            strokeWidth={1.75}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-ink">
            {selected ? `Drop files here to add to “${selected}”` : 'Drop files here or browse'}
          </p>
          <p className="mt-0.5 text-xs text-muted">Encrypted · Max {MAX_FILE_MB} MB</p>
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

      {/* File list */}
      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-line bg-card px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white/[0.02]">
            {selected ? (
              <Folder className="h-5 w-5 text-muted" strokeWidth={1.75} />
            ) : (
              <FileIcon className="h-5 w-5 text-muted" strokeWidth={1.75} />
            )}
          </div>
          <p className="text-sm font-medium text-ink">
            {selected ? `“${selected}” is empty` : 'No files yet'}
          </p>
          <p className="mt-1 text-[13px] text-muted">
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
                className="group flex items-center gap-3.5 rounded-xl border border-line bg-card px-3.5 py-3 transition-colors duration-150 hover:bg-card-hover"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.02]">
                  <Icon className="h-5 w-5 text-cyan-glow" strokeWidth={1.75} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {canPreview ? (
                      <button
                        onClick={() => setPreviewing(f)}
                        className="min-w-0 truncate text-left text-sm font-medium text-ink hover:text-cyan-glow focus-visible:outline-none focus-visible:underline"
                        title="Preview"
                      >
                        {f.filename}
                      </button>
                    ) : (
                      <p className="truncate text-sm font-medium text-ink">{f.filename}</p>
                    )}
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-glow/20 bg-cyan-glow/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-cyan-glow">
                      <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                      Encrypted
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-muted">
                    <span className="truncate">
                      {label} · {humanSize(f.sizeBytes)}
                    </span>
                    {f.folder && selected === null && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-white/[0.03] px-1.5 py-0.5 text-[11px]">
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
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-cyan-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/40"
                      aria-label="Preview"
                      title="Preview"
                    >
                      <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </button>
                  )}
                  <button
                    onClick={() => openMove(f)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-violet-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/40"
                    aria-label="Move to folder"
                    title="Move to folder"
                  >
                    <FolderInput className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => download(f)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-cyan-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/40"
                    aria-label="Download"
                    title="Download"
                  >
                    <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => remove.mutate(f.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
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
      <FilePreview file={previewing} onClose={() => setPreviewing(null)} />

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
          <p className="text-[13px] text-muted">
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
            <p className="truncate text-sm text-muted">{moving.filename}</p>
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
