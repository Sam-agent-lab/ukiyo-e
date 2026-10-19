import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const fontsDir = join(distDir, 'fonts');

let total = 0;
let font = 0;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(path);
    } else if (entry.isFile()) {
      const { size } = await stat(path);
      total += size;

      if (path === fontsDir || path.startsWith(`${fontsDir}/`)) {
        font += size;
      }
    }
  }
}

await walk(distDir);

console.log(`total=${(total / 1024).toFixed(2)} KB`);
console.log(`font=${(font / 1024).toFixed(2)} KB`);

if (total >= 1_500_000 || font >= 300_000) {
  process.exit(1);
}
