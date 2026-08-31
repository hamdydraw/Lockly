import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useToast } from '../components/ui/Toast';
import { api, ApiError } from '../lib/api';
import type { FileMeta } from '../lib/types';

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

export function FilesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: files, isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: () => api.listFiles(),
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadFile(file),
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

  function handleFiles(list: FileList | null) {
    if (!list) return;
    for (const f of Array.from(list)) upload.mutate(f);
  }

  async function download(f: FileMeta) {
    try {
      await api.downloadFile(f.id, f.filename);
    } catch {
      toast('Download failed', 'error');
    }
  }

  const count = files?.length ?? 0;
  const totalBytes = files?.reduce((sum, f) => sum + f.sizeBytes, 0) ?? 0;
  const subtitle = `${count} ${count === 1 ? 'file' : 'files'} · ${humanSize(totalBytes)}`;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">
            Secure files
          </h1>
          <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-glow px-3.5 py-2 text-sm font-medium text-[#0B0D17] transition-colors duration-150 hover:bg-[#7cebff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          <Upload className="h-4 w-4" strokeWidth={2} />
          Upload files
        </button>
      </header>

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
          <p className="text-sm font-medium text-ink">Drop files here or browse</p>
          <p className="mt-0.5 text-xs text-muted">Encrypted · Max 25 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !files || files.length === 0 ? (
        <div className="rounded-xl border border-line bg-card px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white/[0.02]">
            <FileIcon className="h-5 w-5 text-muted" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-ink">No files yet</p>
          <p className="mt-1 text-[13px] text-muted">
            Upload a file to store it encrypted at rest.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map((f) => {
            const { label, Icon } = fileKind(f.filename);
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
                    <p className="truncate text-sm font-medium text-ink">{f.filename}</p>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-glow/20 bg-cyan-glow/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-cyan-glow">
                      <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                      Encrypted
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-muted">
                    {label} · {humanSize(f.sizeBytes)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
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
    </div>
  );
}
