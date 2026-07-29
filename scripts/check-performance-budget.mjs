import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ASSET_DIR = join(ROOT, 'dist', '_astro');
const MAX_JAVASCRIPT_GZIP = 170 * 1024;

const files = await readdir(ASSET_DIR);
let javascriptGzip = 0;
for (const fileName of files.filter((fileName) => fileName.endsWith('.js'))) {
  javascriptGzip += gzipSync(await readFile(join(ASSET_DIR, fileName))).length;
}

console.log(`JavaScript gzip total: ${(javascriptGzip / 1024).toFixed(1)} KiB`);
if (javascriptGzip > MAX_JAVASCRIPT_GZIP) {
  throw new Error(`JavaScript budget exceeded: ${javascriptGzip} > ${MAX_JAVASCRIPT_GZIP}`);
}
