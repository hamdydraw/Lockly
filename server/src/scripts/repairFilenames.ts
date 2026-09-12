/**
 * One-off repair for files uploaded before the multipart filename decoding fix:
 * rewrites names that were stored as latin1-decoded UTF-8 ("Ù�Ù�Ø§Øª.jpg") back
 * to the original text. Names that are already correct are left alone.
 *
 *   npm run repair:filenames -- --dry-run   # list what would change
 *   npm run repair:filenames                # apply
 */
import { prisma } from '../db/prisma.js';
import { decodeUploadFilename } from '../services/filename.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const files: Array<{ id: string; filename: string }> = await prisma.storedFile.findMany({
    select: { id: true, filename: true },
  });
  const broken = files
    .map((f) => ({ ...f, fixed: decodeUploadFilename(f.filename) }))
    .filter((f) => f.fixed !== f.filename);

  if (broken.length === 0) {
    console.log(`Checked ${files.length} file(s); no mis-decoded names found.`);
    return;
  }

  for (const f of broken) console.log(`${f.filename}  →  ${f.fixed}`);

  if (dryRun) {
    console.log(`\n${broken.length} name(s) would be rewritten. Re-run without --dry-run to apply.`);
    return;
  }

  for (const f of broken) {
    await prisma.storedFile.update({ where: { id: f.id }, data: { filename: f.fixed } });
  }
  console.log(`\nRewrote ${broken.length} name(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
