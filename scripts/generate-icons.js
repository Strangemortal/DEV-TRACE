const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create PNG buffer with RGBA pixels
function createPng(width, height, getPixel) {
  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with 0 filter byte per row
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ -1;
}

// DevTrace Icon Design
function renderPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const rCorner = w * 0.22;
  
  // Rounded squircle check
  const dx = Math.max(0, Math.abs(x - cx) - (w / 2 - rCorner));
  const dy = Math.max(0, Math.abs(y - cy) - (h / 2 - rCorner));
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist > rCorner) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Smooth border edge
  let alpha = 255;
  if (dist > rCorner - 1.5) {
    alpha = Math.max(0, Math.min(255, Math.floor((rCorner - dist) * 255)));
  }

  // Base background: Deep sleek navy gradient (#090d16 -> #161e2e)
  const grad = (y / h);
  let bgR = Math.floor(15 + grad * 12);
  let bgG = Math.floor(20 + grad * 18);
  let bgB = Math.floor(32 + grad * 32);

  // Border glow ring
  const borderDist = Math.abs(dist - (rCorner - 4));
  if (dist > rCorner - 8) {
    const glow = Math.max(0, 1 - (borderDist / 6));
    bgR = Math.floor(bgR * (1 - glow) + 56 * glow);
    bgG = Math.floor(bgG * (1 - glow) + 189 * glow);
    bgB = Math.floor(bgB * (1 - glow) + 248 * glow);
  }

  // Center tech emblem: A glowing chevron code bracket & lightning trace
  // Simplified geometric code bracket `< >` and center pulse
  const nx = (x - cx) / (w * 0.5);
  const ny = (y - cy) / (h * 0.5);

  let isSymbol = false;
  // Left bracket <
  if (nx >= -0.65 && nx <= -0.15) {
    const targetX = -0.55 + Math.abs(ny) * 0.8;
    if (Math.abs(nx - targetX) < 0.12 && Math.abs(ny) < 0.55) {
      isSymbol = true;
    }
  }
  // Right bracket >
  if (nx <= 0.65 && nx >= 0.15) {
    const targetX = 0.55 - Math.abs(ny) * 0.8;
    if (Math.abs(nx - targetX) < 0.12 && Math.abs(ny) < 0.55) {
      isSymbol = true;
    }
  }
  // Center pulse slash /
  if (Math.abs(ny + nx * 1.5) < 0.13 && Math.abs(ny) < 0.5) {
    isSymbol = true;
  }

  if (isSymbol) {
    // Neon Cyan / Electric Blue (#38bdf8 -> #60a5fa)
    const symGrad = (nx + 1) / 2;
    const sR = Math.floor(56 + symGrad * 40);
    const sG = Math.floor(189 - symGrad * 24);
    const sB = Math.floor(248 + symGrad * 7);
    return [sR, sG, sB, alpha];
  }

  return [bgR, bgG, bgB, alpha];
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');
const icon192 = createPng(192, 192, renderPixel);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
console.log('✓ Created public/icon-192.png');

const icon512 = createPng(512, 512, renderPixel);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
console.log('✓ Created public/icon-512.png');

// Also create SVG version
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)" stroke="#38bdf8" stroke-opacity="0.3" stroke-width="8"/>
  <path d="M175 160 L95 256 L175 352" fill="none" stroke="url(#accent)" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M337 160 L417 256 L337 352" fill="none" stroke="url(#accent)" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M285 140 L227 372" fill="none" stroke="#60a5fa" stroke-width="32" stroke-linecap="round"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
console.log('✓ Created public/icon.svg');
