import fs from 'node:fs';

/**
 * @typedef {{ format: 'png', width: number, height: number, hasAlpha: boolean, bitDepth: number, colorType: number }} PngInfo
 * @typedef {{ format: 'jpeg', width: number, height: number, hasAlpha: false }} JpegInfo
 * @typedef {PngInfo | JpegInfo} ImageInfo
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export class ImageError extends Error {}

/** @param {Buffer} buffer @returns {ImageInfo} */
export function readImageInfo(buffer) {
  if (isPng(buffer)) return readPngInfo(buffer);
  if (isJpeg(buffer)) return readJpegInfo(buffer);
  throw new ImageError('not a PNG or JPEG file');
}

/** @param {string} file */
export function readImageFile(file) {
  return readImageInfo(fs.readFileSync(file));
}

/** @param {Buffer} buffer */
export function isPng(buffer) {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE);
}

/** @param {Buffer} buffer */
export function isJpeg(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

/** @param {Buffer} buffer @returns {PngInfo} */
export function readPngInfo(buffer) {
  if (!isPng(buffer)) throw new ImageError('missing PNG signature');
  // IHDR must be the first chunk: length (4) + type (4) at offset 8, then width, height, bit depth, color type.
  if (buffer.length < 33 || buffer.toString('latin1', 12, 16) !== 'IHDR') throw new ImageError('missing IHDR chunk');
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  if (width === 0 || height === 0) throw new ImageError('PNG has zero width or height');
  let hasTransparencyChunk = false;
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    if (type === 'tRNS') hasTransparencyChunk = true;
    if (type === 'IDAT' || type === 'IEND') break;
    offset += 12 + length;
  }
  // Color types 4 (gray + alpha) and 6 (RGBA) carry an alpha channel; tRNS adds transparency to the others.
  const hasAlpha = colorType === 4 || colorType === 6 || hasTransparencyChunk;
  return { format: 'png', width, height, hasAlpha, bitDepth, colorType };
}

/** @param {Buffer} buffer @returns {JpegInfo} */
export function readJpegInfo(buffer) {
  if (!isJpeg(buffer)) throw new ImageError('missing JPEG start-of-image marker');
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) throw new ImageError(`invalid JPEG marker at byte ${offset}`);
    let marker = buffer[offset + 1];
    while (marker === 0xff) {
      offset += 1;
      marker = buffer[offset + 1];
    }
    if (marker === undefined) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 4 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC): precision (1), height (2), width (2) follow the length.
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) {
      if (offset + 9 > buffer.length) break;
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      if (width === 0 || height === 0) throw new ImageError('JPEG has zero width or height');
      return { format: 'jpeg', width, height, hasAlpha: false };
    }
    offset += 2 + segmentLength;
  }
  throw new ImageError('no JPEG frame header found');
}
