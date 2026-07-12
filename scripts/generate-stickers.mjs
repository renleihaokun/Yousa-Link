import { readdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const stickersDir = join(__dirname, '..', 'public', 'images', 'stickers');
const outputFile = join(__dirname, '..', 'public', 'images', 'stickers.json');

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

try {
  const files = readdirSync(stickersDir);
  const stickers = files
    .filter(file => ALLOWED_EXTENSIONS.includes(extname(file).toLowerCase()))
    .map(file => `/images/stickers/${file}`);

  writeFileSync(outputFile, JSON.stringify(stickers, null, 2));
  console.log(`✅ Generated stickers.json with ${stickers.length} images`);
} catch (error) {
  console.error('❌ Failed to generate stickers.json:', error.message);
  process.exit(1);
}
