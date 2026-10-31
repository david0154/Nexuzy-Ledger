// v1.10.7 — Regenerates app icons from the high-resolution Nexuzy Ledger mark.
//
// The PWA and Windows launcher icons all come from the same high-resolution
// artwork. The SVG favicon remains a small, self-contained N mark.
//
// Run: `npm run icons`
//
// Uses `sharp` (native binary with prebuilt Windows/macOS/Linux tarballs).

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'icons');
const SRC_PNG = path.join(OUT_DIR, 'icon-512.png');

if (!fs.existsSync(SRC_PNG)) {
  console.error(`FATAL: high-resolution app icon missing at ${SRC_PNG}`);
  process.exit(1);
}
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const brandPng = fs.readFileSync(SRC_PNG);

// Maskable icons need a solid-color safe zone around the artwork
// because Android's adaptive-icon shape (circle, squircle, teardrop…)
// masks the outer 40%. So the "logo" is inset ~62% into a full-bleed
// background rectangle in the same colour as the mark's outer chip.
async function renderPng(size, purpose) {
  if (purpose === 'maskable') {
    // Keep the full-color mark inside the adaptive-icon safe zone.
    const inner = Math.round(size * 0.62);
    const innerPng = await sharp(brandPng).resize(inner, inner).png().toBuffer();
    const gap = Math.round((size - inner) / 2);
    return sharp({
      create: { width: size, height: size, channels: 4, background: '#1e40af' },
    })
      .composite([{ input: innerPng, top: gap, left: gap }])
      .png()
      .toBuffer();
  }
  return sharp(brandPng).resize(size, size).png().toBuffer();
}

const targets = [
  { name: 'icon-192.png',      size: 192, purpose: 'any' },
  { name: 'icon-512.png',      size: 512, purpose: 'any' },
  { name: 'maskable-192.png',  size: 192, purpose: 'maskable' },
  { name: 'maskable-512.png',  size: 512, purpose: 'maskable' },
  { name: 'apple-touch-180.png', size: 180, purpose: 'any' },
];

let total = 0;
for (const t of targets) {
  const buf = await renderPng(t.size, t.purpose);
  const outPath = path.join(OUT_DIR, t.name);
  fs.writeFileSync(outPath, buf);
  total += buf.length;
  console.log(`  ${t.name.padEnd(24)} ${String(t.size + '×' + t.size).padEnd(9)} ${(buf.length / 1024).toFixed(1)} KB  ${t.purpose}`);
}
console.log(`\nWrote ${targets.length} PNGs to ${path.relative(ROOT, OUT_DIR)}/ (${(total / 1024).toFixed(1)} KB total)`);

// v1.10.69 - Windows needs a real .ico, and until now we shipped none: the
// HTA launcher and the Desktop shortcut both drew the blank white page icon,
// which reads as "corrupt download" to a user who has never seen the app
// before.
//
// Two things matter for an icon that does not look broken:
//
// 1. THE ART HAS TO SURVIVE 16 PIXELS. The full mark is a rounded square
//    inside another rounded square, with a translucent panel and a thin bar
//    behind the letter. At 48px and up that reads as depth. At 16px - the
//    size Explorer uses in a list, and the one in a window title bar - the
//    two blues merge into a blurred edge, the panel becomes a grey ghost,
//    the bar becomes a smudge, and the N is left about six pixels tall.
//    It does not look like a logo, it looks like a damaged file. So the
//    small sizes are drawn from a simplified mark: one solid square, one
//    big letter. Same brand, no mush. Type foundries call this an optical
//    size; it is the same reason a 6pt typeface is not just a shrunk 60pt
//    one.
//
// 2. THE CONTAINER HAS TO BE THE BORING KIND. An .ico may hold PNGs, and
//    Windows 11 reads them happily - but .NET's icon loader silently falls
//    back to a smaller image when asked for a PNG-compressed 256, and older
//    shells ignore such entries altogether. Uncompressed BGRA bitmaps are
//    what every Windows since 95 expects, so those are used for every size
//    that fits in one, with PNG kept only for 256 where the bitmap would be
//    256 KB on its own.
const ICO_SMALL = [16, 20, 24];          // simplified mark for title-bar sizes
const ICO_LARGE = [32, 48, 64, 128, 256]; // full mark for taskbar and larger
const ICO_OUT = path.join(ROOT, 'release-templates', '_system-scripts', 'app-icon.ico');

// A simple N remains legible at the smallest Windows taskbar and title-bar
// sizes; the larger ICO entries use the full-color app artwork.
const SIMPLE_SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="13" fill="#2563eb"/>
  <text x="32" y="47" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif"
        font-weight="700" font-size="44" fill="#fff">N</text>
</svg>`);

// An uncompressed icon image: a BITMAPINFOHEADER whose height is doubled
// (colour rows plus the mask), bottom-up BGRA rows, then a 1bpp AND mask.
// The mask is all zeroes because the alpha channel already carries the
// shape; it still has to be there, and its rows still pad to 4 bytes.
async function icoBitmap(image, size) {
  const { data } = await sharp(image).resize(size, size).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const dib = Buffer.alloc(40);
  dib.writeUInt32LE(40, 0);          // header size
  dib.writeInt32LE(size, 4);         // width
  dib.writeInt32LE(size * 2, 8);     // height: colour + mask
  dib.writeUInt16LE(1, 12);          // planes
  dib.writeUInt16LE(32, 14);         // bits per pixel
  dib.writeUInt32LE(0, 16);          // BI_RGB, no compression

  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * size * 4;   // bottom-up
    for (let x = 0; x < size; x++) {
      const s = src + x * 4;
      const d = (y * size + x) * 4;
      pixels[d] = data[s + 2];       // B
      pixels[d + 1] = data[s + 1];   // G
      pixels[d + 2] = data[s];       // R
      pixels[d + 3] = data[s + 3];   // A
    }
  }
  const maskRow = Math.ceil(size / 32) * 4;
  return Buffer.concat([dib, pixels, Buffer.alloc(maskRow * size)]);
}

const images = [];
for (const size of ICO_SMALL) images.push({ size, buf: await icoBitmap(SIMPLE_SVG, size), png: false });
for (const size of ICO_LARGE) {
  images.push(size === 256
    ? { size, buf: await renderPng(256, 'any'), png: true }
    : { size, buf: await icoBitmap(brandPng, size), png: false });
}

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);            // reserved
header.writeUInt16LE(1, 2);            // 1 = icon (2 would be a cursor)
header.writeUInt16LE(images.length, 4);

const entries = [];
let offset = 6 + images.length * 16;
for (const { size, buf } of images) {
  const e = Buffer.alloc(16);
  e.writeUInt8(size === 256 ? 0 : size, 0); // 0 means 256 - the field is one byte
  e.writeUInt8(size === 256 ? 0 : size, 1);
  e.writeUInt8(0, 2);                       // palette size (0 = truecolour)
  e.writeUInt8(0, 3);                       // reserved
  e.writeUInt16LE(1, 4);                    // colour planes
  e.writeUInt16LE(32, 6);                   // bits per pixel
  e.writeUInt32LE(buf.length, 8);
  e.writeUInt32LE(offset, 12);
  entries.push(e);
  offset += buf.length;
}

const ico = Buffer.concat([header, ...entries, ...images.map((i) => i.buf)]);
fs.writeFileSync(ICO_OUT, ico);
console.log(`Wrote ${path.relative(ROOT, ICO_OUT)} (${images.map((i) => i.size).join(', ')} px, ${(ico.length / 1024).toFixed(1)} KB)`);
