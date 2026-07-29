import { createHash } from 'node:crypto';
import { readFile, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import { extname, basename, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const STICKERS_DIR = join(ROOT, 'public', 'images', 'stickers');
const ALBUMS_DIR = join(ROOT, 'public', 'images', 'albums');
const GENERATED_DIR = join(ROOT, 'public', 'generated');
const STICKER_OUTPUT_DIR = join(GENERATED_DIR, 'stickers');
const ALBUM_OUTPUT_DIR = join(GENERATED_DIR, 'albums');
const STICKER_MANIFEST = join(ROOT, 'public', 'images', 'stickers.json');
const ALBUM_MANIFEST = join(ALBUM_OUTPUT_DIR, 'manifest.json');
const ALBUM_DATA = join(ROOT, 'src', 'data', 'albums.json');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const STICKER_MAX_SIZE = 360;
const ALBUM_WIDTHS = [480, 800];

function assertGeneratedPath(target) {
  const root = `${GENERATED_DIR}${sep}`;
  if (target !== GENERATED_DIR && !target.startsWith(root)) {
    throw new Error(`Refusing to modify path outside generated assets: ${target}`);
  }
}

function sortNames(names) {
  return names.sort((first, second) => first < second ? -1 : first > second ? 1 : 0);
}

function publicPath(filePath) {
  return `/${relative(join(ROOT, 'public'), filePath).split(sep).join('/')}`;
}

function safeBaseName(fileName) {
  return basename(fileName, extname(fileName))
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

async function fingerprint(filePath) {
  const input = await readFile(filePath);
  return createHash('sha256').update(input).digest('hex').slice(0, 12);
}

async function prepareOutput() {
  assertGeneratedPath(GENERATED_DIR);
  await rm(GENERATED_DIR, { recursive: true, force: true });
  await Promise.all([
    mkdir(STICKER_OUTPUT_DIR, { recursive: true }),
    mkdir(ALBUM_OUTPUT_DIR, { recursive: true })
  ]);
}

async function generateSticker(fileName) {
  const inputPath = join(STICKERS_DIR, fileName);
  const hash = await fingerprint(inputPath);
  const outputName = `${safeBaseName(fileName)}-${hash}.webp`;
  const outputPath = join(STICKER_OUTPUT_DIR, outputName);
  const source = sharp(inputPath, { animated: true });
  const metadata = await source.metadata();
  const animated = (metadata.pages ?? 1) > 1;

  await source
    .resize({
      width: STICKER_MAX_SIZE,
      height: STICKER_MAX_SIZE,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({
      quality: 80,
      effort: 4,
      loop: metadata.loop ?? 0,
      delay: metadata.delay
    })
    .toFile(outputPath);

  return {
    src: `/images/stickers/${fileName}`,
    thumbnail: publicPath(outputPath),
    width: metadata.width ?? 0,
    height: metadata.pageHeight ?? metadata.height ?? 0,
    animated
  };
}

async function generateStickers() {
  const fileNames = sortNames(
    (await readdir(STICKERS_DIR)).filter((fileName) =>
      ALLOWED_EXTENSIONS.has(extname(fileName).toLowerCase())
    )
  );
  const items = [];
  for (const fileName of fileNames) items.push(await generateSticker(fileName));

  const manifest = { version: 1, items };
  await writeFile(STICKER_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return items;
}

async function generateAlbum(album) {
  const sourceUrl = album.cover;
  const inputPath = join(ROOT, 'public', sourceUrl.replace(/^\//, ''));
  const hash = await fingerprint(inputPath);
  const metadata = await sharp(inputPath).metadata();
  const sourceWidth = metadata.width ?? Math.max(...ALBUM_WIDTHS);
  const widths = [...new Set(ALBUM_WIDTHS.map((width) => Math.min(width, sourceWidth)))];
  const sources = [];

  for (const width of widths) {
    const outputName = `${safeBaseName(basename(inputPath))}-${hash}-${width}w.webp`;
    const outputPath = join(ALBUM_OUTPUT_DIR, outputName);
    await sharp(inputPath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 84, effort: 4, smartSubsample: true })
      .toFile(outputPath);
    sources.push({ src: publicPath(outputPath), width });
  }

  return { src: sourceUrl, sources };
}

async function generateAlbums() {
  const data = JSON.parse(await readFile(ALBUM_DATA, 'utf8'));
  const items = [];
  for (const album of data.albums ?? []) items.push(await generateAlbum(album));
  const manifest = { version: 1, items };
  await writeFile(ALBUM_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return items;
}

async function main() {
  await prepareOutput();
  const [stickers, albums] = await Promise.all([generateStickers(), generateAlbums()]);
  console.log(`Generated ${stickers.length} sticker previews and ${albums.length} album source sets.`);
}

main().catch((error) => {
  console.error(`Failed to generate optimized assets: ${error.message}`);
  process.exitCode = 1;
});
