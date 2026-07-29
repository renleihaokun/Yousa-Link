import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SOURCE_DIR = join(ROOT, 'src');
const OUTPUT_DIR = join(ROOT, 'public', 'assets', 'fonts');
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2';
const SOURCE_EXTENSIONS = new Set(['.astro', '.css', '.json', '.ts']);
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36';
const run = promisify(execFile);

async function download(url) {
  const { stdout } = await run('curl', [
    '--fail',
    '--silent',
    '--show-error',
    '--location',
    '--max-time', '60',
    '--user-agent', USER_AGENT,
    url
  ], { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 });
  return Buffer.from(stdout);
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(entryPath));
    else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(entryPath);
  }
  return files;
}

async function collectText() {
  const characters = new Set();
  for (const filePath of await collectFiles(SOURCE_DIR)) {
    const content = (await readFile(filePath, 'utf8')).normalize('NFC');
    for (const character of content) characters.add(character);
  }
  for (let code = 32; code <= 126; code += 1) characters.add(String.fromCharCode(code));
  return [...characters].sort().join('');
}

function assertOutputPath(target) {
  if (target !== OUTPUT_DIR && !target.startsWith(`${OUTPUT_DIR}${sep}`)) {
    throw new Error(`Refusing to modify path outside font output: ${target}`);
  }
}

async function main() {
  const text = await collectText();
  const url = new URL(GOOGLE_FONTS_URL);
  url.searchParams.append('family', 'Noto Sans SC:wght@300;400;500;700');
  url.searchParams.append('family', 'Press Start 2P');
  url.searchParams.set('display', 'swap');
  url.searchParams.set('text', text);

  let css = (await download(url.href)).toString('utf8');
  const remoteUrls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) ?? [])];
  const assets = [];

  for (const remoteUrl of remoteUrls) {
    const bytes = await download(remoteUrl);
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const fileName = `font-${hash}.woff2`;
    assets.push({ fileName, bytes });
    css = css.split(remoteUrl).join(`/assets/fonts/${fileName}`);
  }

  assertOutputPath(OUTPUT_DIR);
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all(assets.map(({ fileName, bytes }) => writeFile(join(OUTPUT_DIR, fileName), bytes)));
  await writeFile(join(OUTPUT_DIR, 'fonts.css'), `${css.trim()}\n`, 'utf8');
  console.log(`Generated ${assets.length} self-hosted font files for ${text.length} glyphs.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
