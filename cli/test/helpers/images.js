import zlib from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** @param {Buffer} buffer */
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** @param {string} type @param {Buffer} data */
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * A valid, decodable PNG filled with zeros.
 * @param {number} width
 * @param {number} height
 * @param {{ alpha?: boolean, transparency?: boolean }} [options]
 */
export function makePng(width, height, { alpha = false, transparency = false } = {}) {
  const channels = alpha ? 4 : 3;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = alpha ? 6 : 2;
  const rows = Buffer.alloc((width * channels + 1) * height);
  const chunks = [chunk('IHDR', header)];
  if (transparency && !alpha) chunks.push(chunk('tRNS', Buffer.alloc(6)));
  chunks.push(chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ...chunks]);
}

/**
 * JPEG header bytes: SOI, an APP0 segment, a baseline SOF0 frame header, then EOI.
 * Enough for dimension parsing; not decodable image data.
 * @param {number} width
 * @param {number} height
 * @param {{ progressive?: boolean }} [options]
 */
export function makeJpeg(width, height, { progressive = false } = {}) {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const sof = Buffer.from([0xff, progressive ? 0xc2 : 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]);
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from([0xff, 0xd9])]);
}
