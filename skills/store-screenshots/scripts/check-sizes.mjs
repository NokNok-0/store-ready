#!/usr/bin/env node
// Validates images under store/screenshots/ against App Store and Google Play size and format rules.
// Reads PNG IHDR/tRNS and JPEG SOF headers directly; no dependencies.
// Usage: node check-sizes.mjs [projectDir] [--ipad]
//   --ipad  the app runs on iPad, so an "iPad 13-inch display" screenshot is required
// Layout: store/screenshots/ios/{iphone,ipad}/, store/screenshots/android/{phone,tablet,feature-graphic,icon}/
// iOS images are classified by pixel size, not by folder name.
// Exit codes: 0 no errors, 1 at least one error, 2 usage error or no screenshots folder.
// Sources: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
//          https://support.google.com/googleplay/android-developer/answer/1078870
// If Apple's page lists sizes that IOS_CLASSES does not, add them there.

import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const DUO_NOTE = 'Apple lists iPhone Duo sizes as required from April 2027 for builds with the iOS 27.1 SDK or later; confirm App Store Connect accepts them for this build.';

// Portrait sizes; the landscape equivalent (width and height swapped) is also accepted.
// iPad 12.9" shares 2048x2732 with iPad 13-inch; such images count as 13-inch.
const IOS_CLASSES = [
  { id: 'iphone-di-medium', device: 'iphone', label: 'iPhone with Dynamic Island (medium display)', sizes: [[1179, 2556], [1206, 2622]] },
  { id: 'iphone-di-large', device: 'iphone', label: 'iPhone with Dynamic Island (large display)', sizes: [[1260, 2736], [1290, 2796], [1320, 2868]] },
  { id: 'iphone-faceid-large', device: 'iphone', label: 'iPhone with Face ID (large display)', sizes: [[1284, 2778], [1242, 2688]] },
  { id: 'iphone-faceid-medium', device: 'iphone', label: 'iPhone with Face ID (medium display)', sizes: [[1170, 2532], [1125, 2436], [1080, 2340]] },
  { id: 'iphone-home-large', device: 'iphone', label: 'iPhone with Home Button (large display)', sizes: [[1242, 2208]] },
  { id: 'iphone-home-medium', device: 'iphone', label: 'iPhone with Home Button (medium display)', sizes: [[750, 1334]] },
  { id: 'iphone-duo-outer', device: 'iphone', label: 'iPhone Duo (outer display)', sizes: [[1398, 2034]], note: DUO_NOTE },
  { id: 'iphone-duo-inner', device: 'iphone', label: 'iPhone Duo (inner display)', sizes: [[2007, 2853]], note: DUO_NOTE },
  { id: 'ipad-13', device: 'ipad', label: 'iPad 13-inch display', sizes: [[2064, 2752], [2048, 2732]] },
  { id: 'ipad-11', device: 'ipad', label: 'iPad 11-inch display', sizes: [[1488, 2266], [1512, 2316], [1668, 2420], [1668, 2388], [1640, 2360]] },
  { id: 'ipad-10.5', device: 'ipad', label: 'iPad 10.5-inch display', sizes: [[1668, 2224]] },
];
const REQUIRED_IPHONE = 'iphone-di-medium';
const REQUIRED_IPAD = 'ipad-13';
const IOS_FOLDERS = new Set(['iphone', 'ipad']);
const IOS_MIN = 1;
const IOS_MAX = 10;

const PLAY_FOLDERS = new Set(['phone', 'tablet', 'feature-graphic', 'icon']);
const PLAY_MIN_SIDE = 320;
const PLAY_MAX_SIDE = 3840;
const PLAY_MAX_PER_TYPE = 8;
const PLAY_MIN_TO_PUBLISH = 2;
const PLAY_PROMO_COUNT = 4;
const PLAY_PROMO_SIDE = 1080;
const PLAY_FEATURE = [1024, 500];
const PLAY_ICON = [512, 512];
const PLAY_ICON_MAX_BYTES = 1024 * 1024;

const IGNORED_EXT = new Set(['.md', '.txt', '.json', '.yml', '.yaml']);
const IGNORED_NAMES = new Set(['thumbs.db', 'desktop.ini']);
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_COLOR = { 0: 'grayscale', 2: 'RGB', 3: 'palette', 4: 'grayscale+alpha', 6: 'RGBA' };

function readPng(buf) {
  if (buf.length < 33 || buf.toString('ascii', 12, 16) !== 'IHDR') throw new Error('PNG without a valid IHDR chunk');
  const info = {
    format: 'PNG',
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bitDepth: buf[24],
    colorType: buf[25],
    tRNS: false,
  };
  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'tRNS') info.tRNS = true;
    if (type === 'IDAT' || type === 'IEND') break;
    off += 12 + len;
  }
  info.alpha = info.colorType === 4 || info.colorType === 6 || info.tRNS;
  info.rgb24 = info.colorType === 2 && info.bitDepth === 8 && !info.tRNS;
  const kind = PNG_COLOR[info.colorType] ?? `color type ${info.colorType}`;
  info.desc = `PNG ${kind} ${info.bitDepth}-bit/channel${info.tRNS ? ' with tRNS transparency' : ''}`;
  return info;
}

function readJpeg(buf) {
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) throw new Error(`JPEG marker expected at byte ${i}`);
    while (buf[i] === 0xff) i++;
    const m = buf[i];
    i++;
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) continue;
    if (m === 0xd9 || m === 0xda) break;
    if (i + 2 > buf.length) break;
    const len = buf.readUInt16BE(i);
    const isSof = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    if (isSof) {
      if (i + 8 > buf.length) break;
      const components = buf[i + 7];
      return {
        format: 'JPEG',
        height: buf.readUInt16BE(i + 3),
        width: buf.readUInt16BE(i + 5),
        alpha: false,
        rgb24: components === 3,
        desc: `JPEG ${components === 1 ? 'grayscale' : components === 4 ? 'CMYK' : components === 3 ? 'color' : `${components} components`}`,
      };
    }
    i += len;
  }
  throw new Error('JPEG without a frame header (SOF)');
}

async function readImage(file) {
  const buf = await readFile(file);
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIG)) return { ...readPng(buf), bytes: buf.length };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ...readJpeg(buf), bytes: buf.length };
  return null;
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || IGNORED_NAMES.has(e.name.toLowerCase())) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile() && !IGNORED_EXT.has(extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

const dim = (img) => `${img.width}x${img.height}`;
const byId = (id) => IOS_CLASSES.find((c) => c.id === id);
const sizeList = (c) => c.sizes.map(([w, h]) => `${w}x${h}`).join(' or ');

function classifyIos(img) {
  for (const c of IOS_CLASSES) {
    for (const [w, h] of c.sizes) {
      if (img.width === w && img.height === h) return { cls: c, orientation: 'portrait' };
      if (img.width === h && img.height === w) return { cls: c, orientation: 'landscape' };
    }
  }
  return null;
}

function closestIos(img, device) {
  const landscape = img.width > img.height;
  const candidates = [];
  for (const c of IOS_CLASSES) {
    if (device && c.device !== device) continue;
    for (const [w, h] of c.sizes) {
      const [cw, ch] = landscape ? [h, w] : [w, h];
      candidates.push({ text: `${cw}x${ch} (${c.label})`, d: Math.abs(cw - img.width) + Math.abs(ch - img.height) });
    }
  }
  return candidates.sort((a, b) => a.d - b.d).slice(0, 3).map((c) => c.text).join(', ');
}

function checkIos(folder, img, errors, warnings) {
  if (img.alpha) errors.push(`has an alpha channel (${img.desc}); Apple accepts no alpha channels or transparency. Re-export without alpha (flatten onto an opaque background).`);
  const device = IOS_FOLDERS.has(folder) ? folder : null;
  if (!device) warnings.push(`unknown iOS folder "${folder}"; use ios/iphone or ios/ipad`);
  const match = classifyIos(img);
  if (!match) {
    errors.push(`${dim(img)} is not an accepted iOS screenshot size. Closest accepted: ${closestIos(img, device)}.`);
    return null;
  }
  if (device && match.cls.device !== device) warnings.push(`${match.cls.label} size; move it to ios/${match.cls.device}`);
  if (match.cls.note) warnings.push(match.cls.note);
  return match;
}

function checkPlayScreenshot(img, errors, warnings) {
  if (img.alpha) errors.push(`has an alpha channel (${img.desc}); Play asks for JPEG or 24-bit PNG without alpha.`);
  else if (!img.rgb24) warnings.push(`${img.desc}; Play asks for JPEG or 24-bit PNG. Re-export as 8-bit RGB if the upload is refused.`);
  const lo = Math.min(img.width, img.height);
  const hi = Math.max(img.width, img.height);
  if (lo < PLAY_MIN_SIDE || hi > PLAY_MAX_SIDE) errors.push(`${dim(img)}: each side must be ${PLAY_MIN_SIDE}-${PLAY_MAX_SIDE} px.`);
  if (hi > 2 * lo) errors.push(`${dim(img)}: longest side is ${(hi / lo).toFixed(2)}x the shortest; Play allows at most 2x. Crop or pad to 2:1 or squarer.`);
}

function checkExact(img, [w, h], name, errors) {
  if (img.width !== w || img.height !== h) errors.push(`${dim(img)}: ${name} must be exactly ${w}x${h}.`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    console.log('Usage: node check-sizes.mjs [projectDir] [--ipad]');
    console.log('Checks store/screenshots/ios/{iphone,ipad}/ and store/screenshots/android/{phone,tablet,feature-graphic,icon}/.');
    console.log('--ipad: the app runs on iPad, so an iPad 13-inch screenshot is required.');
    process.exit(0);
  }
  const ipad = args.includes('--ipad');
  const unknownFlags = args.filter((a) => a.startsWith('-') && a !== '--ipad');
  if (unknownFlags.length) {
    console.error(`Unknown option(s): ${unknownFlags.join(' ')}`);
    process.exit(2);
  }
  const root = resolve(args.find((a) => !a.startsWith('-')) || '.');
  const shotsDir = join(root, 'store', 'screenshots');
  try {
    if (!(await stat(shotsDir)).isDirectory()) throw new Error();
  } catch {
    console.error(`No folder at ${shotsDir}`);
    process.exit(2);
  }

  const iosCounts = new Map();
  let iosImages = 0;
  const playGroups = new Map();
  let errorCount = 0;
  let warningCount = 0;
  const report = (status, file, msg) => console.log(`${status.padEnd(5)} ${file}${msg ? `  ${msg}` : ''}`);

  for (const file of await walk(shotsDir)) {
    const rel = relative(shotsDir, file).split(/[\\/]/);
    const shown = rel.join('/');
    const platform = rel[0].toLowerCase();
    if (rel.length !== 3 || (platform !== 'ios' && platform !== 'android')) {
      report('warn', shown, 'not in store/screenshots/<ios|android>/<folder>/; skipped');
      warningCount++;
      continue;
    }
    const folder = rel[1].toLowerCase();
    let img;
    try {
      img = await readImage(file);
    } catch (e) {
      report('FAIL', shown, `unreadable: ${e.message}`);
      errorCount++;
      continue;
    }
    if (!img) {
      report('FAIL', shown, 'not a PNG or JPEG file; both stores accept only PNG and JPEG');
      errorCount++;
      continue;
    }

    const errors = [];
    const warnings = [];
    const ext = extname(file).toLowerCase();
    const extOk = img.format === 'PNG' ? ext === '.png' : ext === '.jpg' || ext === '.jpeg';
    if (!extOk) warnings.push(`file extension ${ext || '(none)'} does not match its ${img.format} content`);

    let label = '';
    if (platform === 'ios') {
      iosImages++;
      const match = checkIos(folder, img, errors, warnings);
      if (match) {
        label = ` -> ${match.cls.label}, ${match.orientation}`;
        iosCounts.set(match.cls.id, (iosCounts.get(match.cls.id) || 0) + 1);
      }
    } else {
      if (!PLAY_FOLDERS.has(folder)) warnings.push(`unknown Play folder "${folder}"; checked as screenshots. Known folders: ${[...PLAY_FOLDERS].join(', ')}`);
      if (folder === 'feature-graphic') {
        if (img.alpha) errors.push(`has an alpha channel (${img.desc}); the feature graphic must be JPEG or 24-bit PNG without alpha.`);
        else if (!img.rgb24) warnings.push(`${img.desc}; Play asks for JPEG or 24-bit PNG.`);
        checkExact(img, PLAY_FEATURE, 'the feature graphic', errors);
      } else if (folder === 'icon') {
        if (img.format !== 'PNG') errors.push('the Play icon must be a 32-bit PNG.');
        checkExact(img, PLAY_ICON, 'the Play icon', errors);
        if (img.bytes > PLAY_ICON_MAX_BYTES) errors.push(`${Math.ceil(img.bytes / 1024)} KB; the Play icon must be at most 1024 KB.`);
      } else {
        checkPlayScreenshot(img, errors, warnings);
      }
      img.ok = errors.length === 0;
      if (!playGroups.has(folder)) playGroups.set(folder, []);
      playGroups.get(folder).push(img);
    }

    const line = `${dim(img)} ${img.desc}${label}`;
    if (errors.length) report('FAIL', shown, line);
    else report(warnings.length ? 'warn' : 'ok', shown, line);
    for (const e of errors) console.log(`      - ${e}`);
    for (const w of warnings) console.log(`      ~ ${w}`);
    errorCount += errors.length;
    warningCount += warnings.length;
  }

  console.log('');
  const setErrors = [];
  const setWarnings = [];

  if (iosImages || ipad) {
    for (const c of IOS_CLASSES) {
      const n = iosCounts.get(c.id) || 0;
      if (!n) continue;
      console.log(`ios   ${c.label}: ${n} image(s)`);
      if (n > IOS_MAX) setErrors.push(`${c.label}: ${n} images; Apple allows ${IOS_MIN}-${IOS_MAX} per device size.`);
    }
    const iphoneReq = byId(REQUIRED_IPHONE);
    if (!iosCounts.get(iphoneReq.id)) {
      setErrors.push(`no "${iphoneReq.label}" screenshot (${sizeList(iphoneReq)}, portrait or landscape). At least one is required.`);
    }
    const ipadReq = byId(REQUIRED_IPAD);
    if (ipad && !iosCounts.get(ipadReq.id)) {
      setErrors.push(`no "${ipadReq.label}" screenshot (${sizeList(ipadReq)}, portrait or landscape). Required when the app runs on iPad.`);
    }
  }

  const playShots = [...playGroups].filter(([f]) => f !== 'feature-graphic' && f !== 'icon');
  if (playGroups.size) {
    const total = playShots.reduce((n, [, imgs]) => n + imgs.length, 0);
    if (total < PLAY_MIN_TO_PUBLISH) setErrors.push(`android: ${total} screenshot(s); Play needs at least ${PLAY_MIN_TO_PUBLISH} to publish.`);
    if (!playGroups.has('feature-graphic')) setWarnings.push('android/feature-graphic: not found. Play listings use a 1024x500 feature graphic; check whether your listing needs one.');
    else if (playGroups.get('feature-graphic').length > 1) setWarnings.push('android/feature-graphic: more than one file; Play takes one feature graphic.');
  }
  for (const [folder, imgs] of playShots) {
    if (imgs.length > PLAY_MAX_PER_TYPE) setErrors.push(`android/${folder}: ${imgs.length} images; Play allows up to ${PLAY_MAX_PER_TYPE} per device type.`);
    const promo = imgs.filter((i) => i.ok && Math.min(i.width, i.height) >= PLAY_PROMO_SIDE).length;
    if (promo < PLAY_PROMO_COUNT) {
      setWarnings.push(`android/${folder}: ${promo} screenshot(s) with both sides at least ${PLAY_PROMO_SIDE} px; promotion eligibility needs at least ${PLAY_PROMO_COUNT}.`);
    }
  }

  for (const e of setErrors) console.log(`FAIL  ${e}`);
  for (const w of setWarnings) console.log(`warn  ${w}`);
  errorCount += setErrors.length;
  warningCount += setWarnings.length;

  if (!iosImages && !playGroups.size) {
    console.log('No images found under store/screenshots/<ios|android>/<folder>/.');
    process.exit(errorCount ? 1 : 2);
  }
  console.log(`${errorCount} error(s), ${warningCount} warning(s)`);
  console.log('Not checked by this script: Apple 2.3.3 (more than half of the screenshots for each device size must show the app in use), captions, and outdated UI. Check those by eye.');
  process.exit(errorCount ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
