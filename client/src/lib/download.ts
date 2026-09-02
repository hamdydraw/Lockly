import { isNative } from './config';

/**
 * Saving a Blob differs by platform: the browser can drive an <a download>,
 * but in the Android WebView that silently does nothing — the file has to be
 * written to disk and handed to the system share sheet so the user can put it
 * wherever they want.
 */
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  if (isNative) return saveNative(blob, filename);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function saveNative(blob: Blob, filename: string): Promise<void> {
  // Imported lazily so the web bundle never pulls in the native plugins.
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);

  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await toBase64(blob),
    // Cache, not Documents: decrypted vault files shouldn't linger in a
    // user-browsable folder. Android clears this when space is needed.
    directory: Directory.Cache,
  });

  await Share.share({ title: filename, url: uri });
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // Result is a data: URL; Filesystem wants the payload only.
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
