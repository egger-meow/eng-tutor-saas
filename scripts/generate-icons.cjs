const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const webPublic = path.join(__dirname, '..', 'apps', 'web', 'public');
const adminPublic = path.join(__dirname, '..', 'apps', 'admin', 'public');
if (!fs.existsSync(adminPublic)) {
  fs.mkdirSync(adminPublic, { recursive: true });
}

const iconPath = path.join(webPublic, 'icon.png');
const iconBuf = fs.readFileSync(iconPath);

// 1. Generate SVG with embedded PNG
const base64 = iconBuf.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 251 259" width="251" height="259">
  <image href="data:image/png;base64,${base64}" width="251" height="259" />
</svg>
`;
fs.writeFileSync(path.join(webPublic, 'favicon.svg'), svg, 'utf8');
fs.writeFileSync(path.join(adminPublic, 'favicon.svg'), svg, 'utf8');

// 2. Decode PNG chunks
let pos = 8;
const chunks = [];
let width = 0, height = 0;

while (pos < iconBuf.length) {
  const len = iconBuf.readUInt32BE(pos);
  const type = iconBuf.toString('ascii', pos + 4, pos + 8);
  const data = iconBuf.slice(pos + 8, pos + 8 + len);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
  } else if (type === 'IDAT') {
    chunks.push(data);
  }
  pos += 12 + len;
}

const raw = zlib.inflateSync(Buffer.concat(chunks));
const rgba = Buffer.alloc(width * height * 4);
const rowBytes = width * 4 + 1;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const srcIdx = y * rowBytes + 1 + x * 4;
    const dstIdx = (y * width + x) * 4;
    rgba[dstIdx] = raw[srcIdx];
    rgba[dstIdx + 1] = raw[srcIdx + 1];
    rgba[dstIdx + 2] = raw[srcIdx + 2];
    rgba[dstIdx + 3] = raw[srcIdx + 3];
  }
}

// Bilinear resample
function resize(targetSize) {
  const out = Buffer.alloc(targetSize * targetSize * 4);
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const srcX = (x / targetSize) * width;
      const srcY = (y / targetSize) * height;
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, width - 1);
      const y1 = Math.min(y0 + 1, height - 1);
      const wx = srcX - x0;
      const wy = srcY - y0;

      const idx00 = (y0 * width + x0) * 4;
      const idx10 = (y0 * width + x1) * 4;
      const idx01 = (y1 * width + x0) * 4;
      const idx11 = (y1 * width + x1) * 4;

      const dstIdx = (y * targetSize + x) * 4;
      for (let c = 0; c < 4; c++) {
        const top = rgba[idx00 + c] * (1 - wx) + rgba[idx10 + c] * wx;
        const bot = rgba[idx01 + c] * (1 - wx) + rgba[idx11 + c] * wx;
        out[dstIdx + c] = Math.round(top * (1 - wy) + bot * wy);
      }
    }
  }
  return out;
}

// Encode RGBA to PNG
function makePng(size, rgbaBuf) {
  const rowLen = size * 4 + 1;
  const filtered = Buffer.alloc(size * rowLen);
  for (let y = 0; y < size; y++) {
    filtered[y * rowLen] = 0;
    for (let x = 0; x < size; x++) {
      const srcIdx = (y * size + x) * 4;
      const dstIdx = y * rowLen + 1 + x * 4;
      filtered[dstIdx] = rgbaBuf[srcIdx];
      filtered[dstIdx + 1] = rgbaBuf[srcIdx + 1];
      filtered[dstIdx + 2] = rgbaBuf[srcIdx + 2];
      filtered[dstIdx + 3] = rgbaBuf[srcIdx + 3];
    }
  }
  const compressed = zlib.deflateSync(filtered);

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    crcTable[i] = c;
  }
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const full = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(full), 0);
    return Buffer.concat([len, full, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const sizes = [16, 32, 48, 64, 128, 256];
const pngs = sizes.map(s => makePng(s, resize(s)));

// Save apple-touch-icon.png (180x180)
const touchPng = makePng(180, resize(180));
fs.writeFileSync(path.join(webPublic, 'apple-touch-icon.png'), touchPng);
fs.writeFileSync(path.join(adminPublic, 'apple-touch-icon.png'), touchPng);
fs.writeFileSync(path.join(adminPublic, 'icon.png'), iconBuf);

// Create ICO containing multiple resolutions
const count = pngs.length;
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(count, 4);

let offset = 6 + count * 16;
const dirEntries = [];
for (let i = 0; i < count; i++) {
  const s = sizes[i];
  const pngData = pngs[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(s === 256 ? 0 : s, 0);
  entry.writeUInt8(s === 256 ? 0 : s, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngData.length, 8);
  entry.writeUInt32LE(offset, 12);
  dirEntries.push(entry);
  offset += pngData.length;
}

const icoBuffer = Buffer.concat([icoHeader, ...dirEntries, ...pngs]);
fs.writeFileSync(path.join(webPublic, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(adminPublic, 'favicon.ico'), icoBuffer);

console.log('Successfully generated all icon assets for web and admin!');
