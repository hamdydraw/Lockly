/**
 * Decides how (and whether) a stored file can be rendered inside the app.
 * Detection is by extension first, MIME type second: browsers often upload
 * spreadsheets and text files as application/octet-stream.
 */
export type PreviewKind = 'image' | 'pdf' | 'text' | 'csv' | 'sheet' | 'audio' | 'video';

/** Text and spreadsheets are parsed into DOM nodes; past this size the tab would crawl. */
export const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;
export const MAX_SHEET_PREVIEW_BYTES = 5 * 1024 * 1024;

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico']);
const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'log', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
  'env', 'sh', 'bat', 'ps1', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'htm', 'py', 'rb', 'go',
  'rs', 'java', 'kt', 'c', 'h', 'cpp', 'cs', 'sql', 'diff', 'patch',
]);
const CSV_EXT = new Set(['csv', 'tsv']);
const SHEET_EXT = new Set(['xlsx', 'xlsm', 'xls', 'ods']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac']);
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v']);

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i === -1 ? '' : filename.slice(i + 1).toLowerCase();
}

export function previewKind(filename: string, mimeType: string): PreviewKind | null {
  const ext = extensionOf(filename);
  if (IMAGE_EXT.has(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (CSV_EXT.has(ext)) return 'csv';
  if (SHEET_EXT.has(ext)) return 'sheet';
  if (TEXT_EXT.has(ext)) return 'text';
  if (AUDIO_EXT.has(ext)) return 'audio';
  if (VIDEO_EXT.has(ext)) return 'video';

  const mime = mimeType.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'text/csv') return 'csv';
  if (mime.startsWith('text/') || mime === 'application/json' || mime.endsWith('+xml')) return 'text';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

/** A blob URL for kinds the browser renders natively; the caller must revoke it. */
export function needsObjectUrl(kind: PreviewKind): boolean {
  return kind === 'image' || kind === 'pdf' || kind === 'audio' || kind === 'video';
}

/**
 * Minimal RFC 4180 parser: handles quoted fields, escaped quotes and newlines
 * inside quotes. Delimiter is auto-picked between comma, semicolon and tab.
 */
export function parseCsv(text: string): string[][] {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? undefined : text.indexOf('\n'));
  const delimiter = [',', ';', '\t']
    .map((d) => ({ d, n: firstLine.split(d).length }))
    .sort((a, b) => b.n - a.n)[0]!.d;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
