import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useErrorText } from '../i18n/errors';
import { useI18n } from '../i18n/LanguageProvider';
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

interface FilePreviewProps {
  file: FileMeta | null;
  onClose: () => void;
  /**
   * The files the viewer can page through — normally the previewable files of
   * the folder currently on screen, in the order they are listed. Omit it (or
   * pass a single-entry list) for a viewer with no next/previous.
   */
  siblings?: FileMeta[];
  onNavigate?: (file: FileMeta) => void;
}

/**
 * Full-screen viewer for a stored file. The decrypted bytes are fetched once,
 * kept in memory as a Blob and handed to a renderer picked by file type; a
 * blob: URL is used only for kinds the browser draws natively (image, PDF,
 * media) and is revoked as soon as the viewer closes.
 */
export function FilePreview({ file, onClose, siblings, onNavigate }: FilePreviewProps) {
  const toast = useToast();
  const { t, formatBytes, dir } = useI18n();
  const errorText = useErrorText();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const kind = file ? previewKind(file.filename, file.mimeType) : null;

  // Paging wraps around, so the last item's "next" returns to the first.
  const list = siblings && siblings.length > 1 ? siblings : null;
  const index = list && file ? list.findIndex((f) => f.id === file.id) : -1;
  const canPage = list !== null && index !== -1 && onNavigate !== undefined;

  const step = useCallback(
    (delta: number) => {
      if (!canPage || !list) return;
      const next = list[(index + delta + list.length) % list.length]!;
      if (next.id !== file?.id) onNavigate!(next);
    },
    [canPage, list, index, file?.id, onNavigate],
  );

  // Fetch on open; discard on close or when a different file is chosen.
  useEffect(() => {
    setBlob(null);
    setLoadFailed(false);
    if (!file) return;
    let cancelled = false;
    api
      .fetchFileBlob(file.id)
      .then((b) => {
        if (!cancelled) setBlob(b);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
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
      if (e.key === 'Escape') return onClose();
      // Arrow keys page only for kinds drawn whole; text and sheet panes need
      // the arrows for scrolling, so those page from the buttons alone.
      if (!kind || !needsObjectUrl(kind)) return;
      // Arrows follow what is on screen: in RTL the next file is to the left.
      const nextKey = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const previousKey = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === nextKey) step(1);
      else if (e.key === previousKey) step(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [file, onClose, kind, step, dir]);

  async function download() {
    if (!file) return;
    try {
      // Reuse the bytes already in memory instead of a second decrypt round-trip.
      if (blob) await saveBlob(blob, file.filename);
      else await api.downloadFile(file.id, file.filename);
    } catch (err) {
      toast(errorText(err, 'errors.downloadFailed'), 'error');
    }
  }

  return (
    <AnimatePresence>
      {file && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-overlay backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label={t('preview.dialogLabel', { name: file.filename })}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-line bg-surface-1 px-4 py-3">
            <div className="min-w-0 flex-1">
              {/* dir="auto" so an Arabic or Hebrew name reads right-to-left. */}
              <p dir="auto" className="truncate text-sm font-medium text-fg">
                {file.filename}
              </p>
              <p className="truncate text-[12px] text-fg-muted">
                {canPage && `${t('preview.position', { index: index + 1, total: list!.length })} · `}
                {formatBytes(file.sizeBytes)} · {t('preview.decryptedHere')}
              </p>
            </div>
            <button
              onClick={download}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40"
              aria-label={t('common.download')}
              title={t('common.download')}
            >
              <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40"
              aria-label={t('preview.close')}
              title={t('preview.closeHint')}
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
              {loadFailed ? (
                <Notice
                  icon={AlertCircle}
                  title={t('preview.unavailableTitle')}
                  body={t('preview.loadFailed')}
                />
              ) : !blob || !kind ? (
                <div className="flex items-center gap-2 text-sm text-fg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('preview.decrypting')}
                </div>
              ) : (
                <div className="h-full w-full" onClick={(e) => e.stopPropagation()}>
                  <Renderer kind={kind} blob={blob} url={objectUrl} file={file} onOpenWith={download} />
                </div>
              )}
            </motion.div>

            {canPage && (
              <>
                <PageButton side="start" onClick={() => step(-1)} />
                <PageButton side="end" onClick={() => step(1)} />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Edge-anchored arrow for stepping through the folder: start = previous, end = next. */
function PageButton({ side, onClick }: { side: 'start' | 'end'; onClick: () => void }) {
  const { t } = useI18n();
  const Icon = side === 'start' ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // the backdrop behind it closes the viewer
        onClick();
      }}
      className={
        'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-1/80 text-fg-muted backdrop-blur-sm transition-colors duration-150 hover:bg-surface-1 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40 ' +
        (side === 'start' ? 'start-2 sm:start-4' : 'end-2 sm:end-4')
      }
      aria-label={side === 'start' ? t('preview.previous') : t('preview.next')}
      title={side === 'start' ? t('preview.previousHint') : t('preview.nextHint')}
    >
      {/* Chevrons point toward their edge, so they mirror with the layout. */}
      <Icon className="h-6 w-6 rtl:-scale-x-100" strokeWidth={2} />
    </button>
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
  const { t } = useI18n();
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
            title={t('preview.openInPdfTitle')}
            body={t('preview.openInPdfBody')}
            action={{ label: t('preview.openWith'), onClick: onOpenWith }}
          />
        );
      }
      // bg-white is deliberate in both themes: it is the page behind the user's PDF, not app chrome.
      return (
        <iframe
          src={url ?? undefined}
          title={file.filename}
          className="h-full w-full rounded-lg border border-line bg-white"
        />
      );
    case 'audio':
      return (
        <div className="w-full max-w-lg rounded-xl border border-line bg-surface-2 p-6">
          <p dir="auto" className="mb-4 truncate text-center text-sm text-fg-muted">
            {file.filename}
          </p>
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
        <ol className="select-none border-e border-line pe-3 text-end text-fg-subtle" aria-hidden>
          {lines.map((_, i) => (
            <li key={i}>{i + 1}</li>
          ))}
        </ol>
        {/* Each line takes the direction of its own content, whatever the UI language. */}
        <pre
          dir="auto"
          style={{ unicodeBidi: 'plaintext' }}
          className="min-w-0 flex-1 whitespace-pre-wrap break-words px-3 text-fg"
        >
          {shown}
        </pre>
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
  const { t } = useI18n();
  const [sheets, setSheets] = useState<ParsedSheet[] | null>(null);
  const [active, setActive] = useState(0);
  const [unreadable, setUnreadable] = useState(false);
  const tooLarge = blob.size > MAX_SHEET_PREVIEW_BYTES;

  useEffect(() => {
    setSheets(null);
    setActive(0);
    setUnreadable(false);
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
        if (!cancelled) setUnreadable(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob, tooLarge]);

  if (tooLarge) return <TooLarge limit={MAX_SHEET_PREVIEW_BYTES} />;
  if (unreadable) {
    return (
      <Notice icon={AlertCircle} title={t('preview.cannotReadSheet')} body={t('preview.sheetUnreadable')} />
    );
  }
  if (sheets === null) return <Spinner label={t('preview.readingWorkbook')} />;
  if (sheets.length === 0) {
    return <Notice icon={AlertCircle} title={t('preview.emptyWorkbook')} body={t('preview.noSheets')} />;
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
                dir="auto"
                onClick={() => setActive(i)}
                className={
                  'shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/40 ' +
                  (i === active
                    ? 'bg-accent/10 text-fg'
                    : 'text-fg-muted hover:bg-surface-3 hover:text-fg')
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
  const { t } = useI18n();
  const cols = Math.min(MAX_TABLE_COLS, rows.reduce((m, r) => Math.max(m, r.length), 0));
  const shown = rows.slice(0, MAX_TABLE_ROWS);
  const truncated = rows.length > MAX_TABLE_ROWS || rows.some((r) => r.length > MAX_TABLE_COLS);

  if (rows.length === 0) {
    return <p className="p-6 text-center text-sm text-fg-muted">{t('preview.emptySheet')}</p>;
  }

  return (
    <>
      <table className="border-collapse font-mono text-[12px] leading-tight">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="sticky start-0 z-20 border-b border-e border-line bg-surface-1 px-2 py-1.5 text-end text-fg-subtle" />
            {Array.from({ length: cols }, (_, c) => (
              <th
                key={c}
                className="border-b border-e border-line bg-surface-1 px-3 py-1.5 text-center font-medium text-fg-muted"
              >
                {columnLetter(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={i} className="odd:bg-fg/[0.02] hover:bg-surface-3">
              <td className="sticky start-0 z-10 border-b border-e border-line bg-surface-1 px-2 py-1 text-end text-fg-subtle">
                {i + 1}
              </td>
              {Array.from({ length: cols }, (_, c) => (
                <td
                  key={c}
                  className="max-w-[320px] truncate border-b border-e border-line/60 px-3 py-1 text-fg"
                  title={r[c] ?? ''}
                >
                  {/* Cell text keeps its own direction; the grid follows the UI. */}
                  <bdi dir="auto">{r[c] ?? ''}</bdi>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {truncated && (
        <p className="sticky start-0 border-t border-line bg-surface-1 px-3 py-2 text-[12px] text-fg-muted">
          {t('preview.truncated', { rows: MAX_TABLE_ROWS, cols: MAX_TABLE_COLS })}
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
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-line bg-surface-2 shadow-pop">
      <div className="min-h-0 flex-1 overflow-auto p-4 [scrollbar-width:thin]">{children}</div>
      {footer && <div className="border-t border-line bg-surface-1 px-3 py-2">{footer}</div>}
    </div>
  );
}

function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-fg-muted">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? t('preview.rendering')}
    </div>
  );
}

function TooLarge({ limit }: { limit: number }) {
  const { t, formatBytes } = useI18n();
  return (
    <Notice
      icon={AlertCircle}
      title={t('preview.tooLargeTitle')}
      body={t('preview.tooLargeBody', { size: formatBytes(limit) })}
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
      className="mx-auto w-full max-w-sm rounded-xl border border-line bg-surface-2 px-6 py-8 text-center shadow-pop"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-fg/[0.03]">
        <Icon className="h-5 w-5 text-fg-muted" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mt-1 text-[13px] text-fg-muted">{body}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-fg-on-accent transition-colors duration-150 hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg/50"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={2} />
          {action.label}
        </button>
      )}
    </div>
  );
}
