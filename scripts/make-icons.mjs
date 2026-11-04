/**
 * Makes the app icons (public/icon-192.png and public/icon-512.png) from a
 * 16×16 pixel drawing below — Bek's cabin at night.
 * Uses only Node's built-in zlib to write PNG files, so no extra packages.
 *
 * Run with:  npm run icons
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const COLORS = {
  n: [26, 35, 80], // night sky
  s: [255, 248, 208], // star
  m: [244, 241, 222], // moon
  k: [201, 201, 214], // chimney smoke
  c: [140, 140, 140], // chimney stone
  r: [158, 59, 47], // roof
  R: [110, 42, 34], // roof edge
  w: [176, 122, 62], // oak wall
  y: [255, 210, 122], // warm lit window
  o: [90, 58, 29], // door
  g: [63, 122, 38], // grass
  G: [47, 90, 29], // dark grass
};

// 16×16 picture: Bek's cabin at night, windows glowing, smoke from the chimney, a crescent moon.
const ART = [
  'nnnnnnnnnnnnnnnn',
  'nnsnnnnnnnnnmmnn',
  'nnnnnnnnnnnmmnnn',
  'nnnnnnnnnkknnnnn',
  'nnnnnnnnnnkknnsn',
  'nnnnnnnrrnncnnnn',
  'nnnnnnrrrrncnnnn',
  'nnnnnrrrrrrcnnnn',
  'nnnnrrrrrrrrnnnn',
  'nnnrrrrrrrrrrnnn',
  'nnRRRRRRRRRRRRnn',
  'nnnwwwwwwwwwwnnn',
  'nnnwyywoowyywnnn',
  'nnnwyywoowyywnnn',
  'gggwwwwoowwwwggg',
  'GGGGGGGGGGGGGGGG',
];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const scale = size / 16;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const ch = ART[Math.floor(y / scale)][Math.floor(x / scale)];
      const [r, g, b] = COLORS[ch] ?? COLORS.n;
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), png(size));
  console.log(`wrote public/icon-${size}.png`);
}
