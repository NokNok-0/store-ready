import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { describe, it } from 'node:test';
import { ImageError, readImageInfo, readJpegInfo, readPngInfo } from '../../src/parsers/image.js';
import { makeJpeg, makePng } from '../helpers/images.js';

describe('readPngInfo', () => {
  it('reads RGB dimensions without alpha', () => {
    assert.deepEqual(readPngInfo(makePng(1024, 1024)), { format: 'png', width: 1024, height: 1024, hasAlpha: false, bitDepth: 8, colorType: 2 });
  });

  it('detects an RGBA alpha channel', () => {
    const info = readPngInfo(makePng(512, 300, { alpha: true }));
    assert.equal(info.width, 512);
    assert.equal(info.height, 300);
    assert.equal(info.hasAlpha, true);
    assert.equal(info.colorType, 6);
  });

  it('treats a tRNS chunk as transparency', () => {
    assert.equal(readPngInfo(makePng(10, 10, { transparency: true })).hasAlpha, true);
  });

  it('produces PNGs whose image data inflates to the expected size', () => {
    const png = makePng(3, 2);
    const idatOffset = png.indexOf('IDAT', 0, 'latin1');
    const length = png.readUInt32BE(idatOffset - 4);
    const raw = zlib.inflateSync(png.subarray(idatOffset + 4, idatOffset + 4 + length));
    assert.equal(raw.length, (3 * 3 + 1) * 2);
  });

  it('rejects truncated or non-PNG data', () => {
    assert.throws(() => readPngInfo(Buffer.from('not a png')), ImageError);
    assert.throws(() => readPngInfo(makePng(4, 4).subarray(0, 20)), ImageError);
  });
});

describe('readJpegInfo', () => {
  it('reads baseline and progressive frame headers', () => {
    assert.deepEqual(readJpegInfo(makeJpeg(1206, 2622)), { format: 'jpeg', width: 1206, height: 2622, hasAlpha: false });
    assert.deepEqual(readJpegInfo(makeJpeg(2048, 2732, { progressive: true })), { format: 'jpeg', width: 2048, height: 2732, hasAlpha: false });
  });

  it('skips fill bytes and segments before the frame header', () => {
    const jpeg = makeJpeg(640, 480);
    const withFill = Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xff]), jpeg.subarray(2)]);
    assert.equal(readJpegInfo(withFill).width, 640);
  });

  it('ignores DHT (0xC4) which shares the SOF marker range', () => {
    const dht = Buffer.from([0xff, 0xc4, 0x00, 0x04, 0x00, 0x00]);
    const jpeg = makeJpeg(100, 50);
    const buffer = Buffer.concat([jpeg.subarray(0, 2), dht, jpeg.subarray(2)]);
    assert.deepEqual(readJpegInfo(buffer), { format: 'jpeg', width: 100, height: 50, hasAlpha: false });
  });

  it('fails when no frame header exists', () => {
    assert.throws(() => readJpegInfo(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), ImageError);
  });
});

describe('readImageInfo', () => {
  it('detects the format from the bytes', () => {
    assert.equal(readImageInfo(makePng(1, 1)).format, 'png');
    assert.equal(readImageInfo(makeJpeg(1, 1)).format, 'jpeg');
    assert.throws(() => readImageInfo(Buffer.from('GIF89a')), ImageError);
  });
});
