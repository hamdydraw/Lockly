import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Download, ExternalLink, Loader2, X, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { isNative } from '../lib/config';
import { saveBlob } from '../lib/download';
import {
  MAX_SHEET_PREVIEW_BYTES,
  MAX_TEXT_PREVIEW_BYTES,
  needsObjectUrl,
  parseCsv,
  previewKind,
  type PreviewKind,
} from '../lib/preview';
import type { FileMeta } from '../lib/types';
import { useToast } from './ui/Toast';

const MAX_TABLE_ROWS = 1000;
const MAX_TABLE_COLS = 100;

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FilePreviewProps {
  file: FileMeta | null;
  onClose: () => void;
}

/**
 * Full-screen viewer for a stored file. The decrypted bytes are fetched once,
 * kept in memory as a Blob and handed to a renderer picked by file type; a
 * blob: URL is used only for kinds the browser draws natively (image, PDF,
 * media) and is revoked as soon as the viewer closes.
 */
export function FilePreview({ file, onClose }: FilePreviewProps) {
  const toast = useToast();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kind = file ? previewKind(file.filename, file.mimeType) : null;

  // Fetch on open; discard on close or when a different file is chosen.
  useEffect(() => {
    setBlob(null);
    setError(null);
    if (!file) return;
    let cancelled = false;
    api
      .fetchFileBlob(file.id)
      .then((b) => {
        if (!cancelled) setBlob(b);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this file. Try downloading it instead.');
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Object URL lifecycle is tied to the blob, not to the component, so a
  // re-render never leaks a URL to decrypted content.
  const objectUrl = useMemo(
    () => (blob && kind && needsObjectUrl(kind) ? URL.createObjectURL(blob) : null),
    [blob, kind],
  );
  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  // Escape closes; body scroll is locked while the viewer is up.
  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [file, onClose]);

  async function download() {
    if (!file) return;
    try {
      // Reuse the bytes already in memory instead of a second decrypt round-trip.
      if (blob) await saveBlob(blob, file.filename);
      else await api.downloadFile(file.id, file.filename);
    } catch {
      toast('Download failed', 'error');
    }
  }

  return (
    <AnimatePresence>
      {file && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${file.filename}`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-line bg-sidebar px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{file.filename}</p>
              <p className="truncate text-[12px] text-muted">
                {humanSize(file.sizeBytes)} · Decrypted in this tab only
              </p>
            </div>
            <button
              onClick={download}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-cyan-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/40"
              aria-label="Download"
              title="Download"
            >
              <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/40"
              aria-label="Close preview"
              title="Close (Esc)"
              autoFocus
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          {/* Body. Clicking the empty backdrop closes; clicking content does not. */}
          <div className="relative min-h-0 flex-1" onClick={onClose}>
            <motion.div
              className="absolute inset-0 flex items-center justify-center p-3 sm:p-6"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {error ? (
                <Notice icon={AlertCircle} title="Preview unavailable" body={error} />
              ) : !blob || !kind ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Decrypting…
                </div>
              ) : (
                <div className="h-full w-full" onClick={(e) => e.stopPropagation()}>
                  <Renderer kind={kind} blob={blob} url={objectUrl} file={file} onOpenWith={download} />
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

function Renderer({
  kind,
  blob,
  url,
  file,
  onOpenWith,
}: {
  kind: PreviewKind;
  blob: Blob;
  url: string | null;
  file: FileMeta;
  onOpenWith: () => void;
}) {
  switch (kind) {
    case 'image':
      return (
        <div className="flex h-full w-full items-center justify-center">
          <img
            src={url ?? undefined}
            alt={file.filename}
            className="max-h-full max-w-full rounded-lg object-contain shadow-pop"
          />
        </div>
      );
    case 'pdf':
      // The Android WebView has no built-in PDF renderer, so hand off to the system.
      if (isNative) {
        return (
          <Notice
            icon={ExternalLink}
            title="Open in a PDF app"
            body="This device cannot show PDFs inside Lockly. Open it with another app instead; the decrypted copy is kept in the app cache only."
            action={{ label: 'Open with…', onClick: onOpenWith }}
          />
        );
      }
      return (
        <iframe
          src={url ?? undefined}
          title={file.filename}
          className="h-full w-full rounded-lg border border-line bg-white"
        />
      );
    case 'audio':
      return (
        <div className="w-full max-w-lg rounded-xl border border-line bg-card p-6">
          <p className="mb-4 truncate text-center text-sm text-muted">{file.filename}</p>
          <audio src={url ?? undefined} controls className="w-full" />
        </div>
      );
    case 'video':
      return (
        <video
          src={url ?? undefined}
          controls
          className="max-h-full max-w-full rounded-lg shadow-pop"
        />
      );
    case 'text':
      return <TextRenderer blob={blob} filename={file.filename} />;
    case 'csv':
      return <CsvRenderer blob={blob} />;
    case 'sheet':
      return <SheetRenderer blob={blob} />;
  }
}

function useBlobText(blob: Blob, limit: number): { text: string | null; tooLarge: boolean } {
  const [text, setText] = useState<string | null>(null);
  const tooLarge = blob.size > limit;
  useEffect(() => {
    setText(null);
    if (tooLarge) return;
    let cancelled = false;
    blob.text().then((t) => {
      if (!cancelled) setText(t);
    });
    return () => {
      cancelled = true;
    };
  }, [blob, tooLarge]);
  return { text, tooLarge };
}

function TextRenderer({ blob, filename }: { blob: Blob; filename: string }) {
  const { text, tooLarge } = useBlobText(blob, MAX_TEXT_PREVIEW_BYTES);
  if (tooLarge) return <TooLarge limit={MAX_TEXT_PREVIEW_BYTES} />;
  if (text === null) return <Spinner />;

  // JSON is re-indented for readability; anything else is shown verbatim.
  let shown = text;
  if (filename.toLowerCase().endsWith('.json')) {
    try {
      shown = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      /* leave malformed JSON as-is */
    }
  }
  const lines = shown.split('\n');

  return (
    <Pane>
      <div className="flex font-mono text-[12.5px] leading-[1.6]">
        <ol className="select-none border-r border-line pr-3 text-right text-muted/60" aria-hidden>
          {lines.map((_, i) => (
            <li key={i}>{i + 1}</li>
          ))}
        </ol>
        <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words pl-3 text-ink">{shown}</pre>
      </div>
    </Pane>
  );
}

function CsvRenderer({ blob }: { blob: Blob }) {
  const { text, tooLarge } = useBlobText(blob, MAX_TEXT_PREVIEW_BYTES);
  const rows = useMemo(() => (text === null ? null : parseCsv(text)), [text]);
  if (tooLarge) return <TooLarge limit={MAX_TEXT_PREVIEW_BYTES} />;
  if (rows === null) return <Spinner />;
  return (
    <Pane>
      <Grid rows={rows} />
    </Pane>
  );
}

interface ParsedSheet {
  name: string;
  rows: string[][];
}

function SheetRenderer({ blob }: { blob: Blob }) {
  const [sheets, setSheets] = useState<ParsedSheet[] | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const tooLarge = blob.size > MAX_SHEET_PREVIEW_BYTES;

  useEffect(() => {
    setSheets(null);
    setActive(0);
    setError(null);
    if (tooLarge) return;
    let cancelled = false;
    (async () => {
      try {
        // SheetJS is ~400 KB, so it is loaded only when a spreadsheet is opened.
        const [XLSX, buf] = await Promise.all([import('xlsx'), blob.arrayBuffer()]);
        const wb = XLSX.read(buf, { type: 'array', dense: true, cellFormula: false });
        const parsed = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name]!;
          const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
            header: 1,
            raw: false, // formatted text as Excel would show it (dates, currency, %)
            defval: '',
            blankrows: false,
          });
          return { name, rows };
        });
        if (!cancelled) setSheets(parsed);
      } catch {
        if (!cancelled) {
          setError('This spreadsheet could not be read. It may be password-protected or corrupted.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob, tooLarge]);

  if (tooLarge) return <TooLarge limit={MAX_SHEET_PREVIEW_BYTES} />;
  if (error) return <Notice icon={AlertCircle} title="Cannot read spreadsheet" body={error} />;
  if (sheets === null) return <Spinner label="Reading workbook…" />;
  if (sheets.length === 0) {
    return <Notice icon={AlertCircle} title="Empty workbook" body="This file has no sheets." />;
  }

  const sheet = sheets[Math.min(active, sheets.length - 1)]!;
  return (
    <Pane
      footer={
        sheets.length > 1 ? (
          <div className="flex gap-1 overflow-x-auto">
            {sheets.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setActive(i)}
                className={
                  'shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/40 ' +
                  (i === active
                    ? 'bg-violet-glow/[0.15] text-ink'
                    : 'text-muted hover:bg-white/[0.05] hover:text-ink')
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      <Grid rows={sheet.rows} />
    </Pane>
  );
}

/** Spreadsheet-style table with row numbers and A/B/C column letters. */
function Grid({ rows }: { rows: string[][] }) {
  const cols = Math.min(MAX_TABLE_COLS, rows.reduce((m, r) => Math.max(m, r.length), 0));
  const shown = rows.slice(0, MAX_TABLE_ROWS);
  const truncated = rows.length > MAX_TABLE_ROWS || rows.some((r) => r.length > MAX_TABLE_COLS);

  if (rows.length === 0) {
    return <p className="p-6 text-center text-sm text-muted">This sheet is empty.</p>;
  }

  return (
    <>
      <table className="border-collapse font-mono text-[12px] leading-tight">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="sticky left-0 z-20 border-b border-r border-line bg-sidebar px-2 py-1.5 text-right text-muted/60" />
            {Array.from({ length: cols }, (_, c) => (
              <th
                key={c}
                className="border-b border-r border-line bg-sidebar px-3 py-1.5 text-center font-medium text-muted"
              >
                {columnLetter(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={i} className="odd:bg-white/[0.012] hover:bg-white/[0.035]">
              <td className="sticky left-0 z-10 border-b border-r border-line bg-sidebar px-2 py-1 text-right text-muted/60">
                {i + 1}
              </td>
              {Array.from({ length: cols }, (_, c) => (
                <td
                  key={c}
                  className="max-w-[320px] truncate border-b border-r border-line/60 px-3 py-1 text-ink"
                  title={r[c] ?? ''}
                >
                  {r[c] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {truncated && (
        <p className="sticky left-0 border-t border-line bg-sidebar px-3 py-2 text-[12px] text-muted">
          Showing the first {MAX_TABLE_ROWS.toLocaleString()} rows and {MAX_TABLE_COLS} columns.
          Download the file for the full data.
        </p>
      )}
    </>
  );
}

function columnLetter(index: number): string {
  let s = '';
  let n = index;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

/** Scrollable card that fills the viewer; optional footer for sheet tabs. */
function Pane({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-line bg-card shadow-pop">
      <div className="min-h-0 flex-1 overflow-auto p-4 [scrollbar-width:thin]">{children}</div>
      {footer && <div className="border-t border-line bg-sidebar px-3 py-2">{footer}</div>}
    </div>
  );
}

function Spinner({ label = 'Rendering…' }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function TooLarge({ limit }: { limit: number }) {
  return (
    <Notice
      icon={AlertCircle}
      title="Too large to preview"
      body={`Files of this type over ${humanSize(limit)} are not rendered in the browser. Download it to open locally.`}
    />
  );
}

function Notice({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className="mx-auto w-full max-w-sm rounded-xl border border-line bg-card px-6 py-8 text-center shadow-pop"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white/[0.02]">
        <Icon className="h-5 w-5 text-muted" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 text-[13px] text-muted">{body}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-glow px-3.5 py-2 text-sm font-medium text-[#0B0D17] transition-colors duration-150 hover:bg-[#7cebff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/50"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={2} />
          {action.label}
        </button>
      )}
    </div>
  );
}
