/**
 * busboy (under multer) decodes multipart field values as latin1, so a UTF-8
 * filename arrives as one character per byte ("ملفات.jpg" → "Ù�Ù�Ø§Øª.jpg").
 * Re-reading those code points as UTF-8 bytes restores the original; a name
 * that was genuinely latin1 does not round-trip and is returned unchanged.
 */
export function decodeUploadFilename(name: string): string {
  const bytes = Buffer.from(name, 'latin1');
  const utf8 = bytes.toString('utf8');
  if (utf8.includes('�')) return name;
  return Buffer.compare(Buffer.from(utf8, 'utf8'), bytes) === 0 ? utf8 : name;
}
