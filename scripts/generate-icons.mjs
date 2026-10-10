// Genera los íconos PNG de la PWA (192, 512, maskable y apple-touch-icon)
// sin dependencias externas: usa solo módulos nativos de Node (zlib).
// Diseño: degradado índigo→violeta con un "check" blanco.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---------- Codificador PNG mínimo (RGBA, sin dependencias) ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // filas con filtro 0
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Dibujo del ícono ----------
const START = [0x4f, 0x46, 0xe7]; // #4f46e7 índigo
const END = [0x93, 0x33, 0xea]; // #9333ea violeta

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  // Radio de esquina: maskable ocupa todo el cuadro (el sistema recorta).
  const radius = maskable ? 0 : Math.round(size * 0.22);
  // Zona segura maskable: el diseño vive dentro del 60% central.
  const pad = maskable ? size * 0.2 : size * 0.16;

  // Puntos del "check" dentro del área con padding.
  const x0 = pad;
  const y0 = pad;
  const w = size - pad * 2;
  const p1 = [x0 + w * 0.1, y0 + w * 0.52];
  const p2 = [x0 + w * 0.4, y0 + w * 0.8];
  const p3 = [x0 + w * 0.92, y0 + w * 0.24];
  const stroke = Math.max(2, w * 0.13);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Esquinas redondeadas con transparencia (no maskable).
      let alpha = 255;
      if (radius > 0) {
        const cx = x < radius ? radius : x >= size - radius ? size - radius - 1 : x;
        const cy = y < radius ? radius : y >= size - radius ? size - radius - 1 : y;
        const d = Math.hypot(x - cx, y - cy);
        if (d > radius) alpha = 0;
        else if (d > radius - 1.5) alpha = Math.round(255 * (1 - (d - (radius - 1.5)) / 1.5));
      }

      // Degradado diagonal.
      const t = Math.min(1, (x + y) / (size * 2));
      rgba[i] = lerp(START[0], END[0], t);
      rgba[i + 1] = lerp(START[1], END[1], t);
      rgba[i + 2] = lerp(START[2], END[2], t);
      rgba[i + 3] = alpha;

      if (alpha === 0) continue;

      // Check blanco.
      const d1 = distToSegment(x, y, p1[0], p1[1], p2[0], p2[1]);
      const d2 = distToSegment(x, y, p2[0], p2[1], p3[0], p3[1]);
      const d = Math.min(d1, d2);
      if (d < stroke) {
        const edge = d > stroke - 1.2 ? 1 - (d - (stroke - 1.2)) / 1.2 : 1;
        rgba[i] = lerp(rgba[i], 255, edge);
        rgba[i + 1] = lerp(rgba[i + 1], 255, edge);
        rgba[i + 2] = lerp(rgba[i + 2], 255, edge);
      }
    }
  }
  return encodePNG(size, size, rgba);
}

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-192.png', 192, true],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
];

for (const [name, size, maskable] of targets) {
  const png = drawIcon(size, { maskable });
  writeFileSync(join(outDir, name), png);
  console.log(`✓ ${name} (${size}x${size}, ${png.length} bytes)`);
}

// favicon.png 32x32
writeFileSync(join(outDir, '..', 'favicon.png'), drawIcon(32, { maskable: false }));
console.log('✓ favicon.png (32x32)');
