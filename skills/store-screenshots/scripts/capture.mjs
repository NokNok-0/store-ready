#!/usr/bin/env node
// Captures web screenshots at exact store pixel sizes with a locally installed Chrome or Edge, headless,
// over the Chrome DevTools Protocol. No dependencies. Needs Node 22+ for the global WebSocket
// (Node 20 can still run --flatten).
//
// Usage: node capture.mjs <plan.json> [--browser <path>] [--only <set>[,<set>]]
//        node capture.mjs --flatten <file.png> [...]     re-encode PNGs as RGB without alpha (Node 20+)
//
// Plan (paths in "out" are relative to the current folder; "seed" is relative to the plan file):
// {
//   "baseUrl": "http://localhost:8081",
//   "background": "#ffffff",                    opaque color behind the page and for flattening
//   "seed": "seed.json",                        optional: { "key": value } written to localStorage
//   "localStorage": { "key": "value" },         optional, same as seed, inline (merged over seed)
//   "sets": [
//     { "name": "iphone", "out": "store/screenshots/ios/iphone", "size": "1206x2622" },
//     { "name": "android", "out": "store/screenshots/android/phone", "width": 360, "height": 720, "scale": 3 }
//   ],
//   "shots": [
//     { "file": "01-today.png", "route": "/" , "waitFor": "text=Today" },
//     { "file": "02-habit.png", "route": "/habit/1", "sets": ["iphone"] },
//     { "file": "02-habit.png", "click": ["text=Read 20 pages"], "sets": ["android"], "delay": 800 }
//   ]
// }
// Shot fields: file (required), route (navigate to baseUrl + route; omit to stay on the current page),
// click (selector or list: CSS, or "text=Exact label"), waitFor (selector to wait for before capture),
// delay (ms after loading and clicks, default 500), sets (names this shot applies to), reseed (true:
// clear and re-seed storage before this shot's navigation).
// Set fields: name, out, and either size (a known store size, see SIZES) or width + height + scale; mobile
// (default false) turns on mobile viewport emulation; userAgent (optional).
//
// Every set starts in a fresh tab with storage cleared and seeded before any page script runs.
// Exit codes: 0 all shots saved, 1 a shot failed, 2 usage error, no browser found, or Node without WebSocket.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

const SIZES = {
  '1206x2622': { width: 402, height: 874, scale: 3 },
  '1179x2556': { width: 393, height: 852, scale: 3 },
  '1320x2868': { width: 440, height: 956, scale: 3 },
  '2064x2752': { width: 1032, height: 1376, scale: 2 },
  '2048x2732': { width: 1024, height: 1366, scale: 2 },
  '1080x1920': { width: 360, height: 640, scale: 3 },
  '1080x2160': { width: 360, height: 720, scale: 3 },
  '1024x500': { width: 1024, height: 500, scale: 1 },
};

// ---------- PNG: decode, flatten onto an opaque color, encode as 8-bit RGB ----------

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) throw new Error('not a PNG');
  let off = 8;
  let ihdr = null;
  let trns = null;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error('PNG without IHDR');
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.color];
  if (ihdr.depth !== 8 || !channels || ihdr.interlace !== 0) {
    throw new Error(`unsupported PNG (bit depth ${ihdr.depth}, color type ${ihdr.color}, interlace ${ihdr.interlace}); export it as 8-bit RGB or RGBA`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = ihdr.width * channels;
  const out = Buffer.alloc(stride * ihdr.height);
  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = src[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`bad PNG filter ${filter}`);
      row[x] = v & 0xff;
    }
  }
  return { ...ihdr, channels, pixels: out, trns };
}

function flattenToRgb(png, bg) {
  const { width, height, channels, pixels, color, trns } = png;
  const rgb = Buffer.alloc(width * height * 3);
  const key = color === 2 && trns && trns.length >= 6 ? [trns.readUInt16BE(0), trns.readUInt16BE(2), trns.readUInt16BE(4)] : null;
  const grayKey = color === 0 && trns && trns.length >= 2 ? trns.readUInt16BE(0) : null;
  for (let i = 0, j = 0; i < pixels.length; i += channels, j += 3) {
    let r, g, b, a;
    if (channels >= 3) [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    else r = g = b = pixels[i];
    a = channels === 4 ? pixels[i + 3] : channels === 2 ? pixels[i + 1] : 255;
    if ((key && r === key[0] && g === key[1] && b === key[2]) || (grayKey !== null && r === grayKey)) a = 0;
    rgb[j] = Math.round((r * a + bg[0] * (255 - a)) / 255);
    rgb[j + 1] = Math.round((g * a + bg[1] * (255 - a)) / 255);
    rgb[j + 2] = Math.round((b * a + bg[2] * (255 - a)) / 255);
  }
  return rgb;
}

function encodeRgbPng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (stride + 1);
    raw[o] = y ? 2 : 0;
    for (let x = 0; x < stride; x++) {
      const v = rgb[y * stride + x];
      raw[o + 1 + x] = y ? (v - rgb[(y - 1) * stride + x]) & 0xff : v;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function parseColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '#ffffff');
  if (!m) throw new Error(`background must be a hex color like "#ffffff", got ${JSON.stringify(hex)}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function flattenFile(file, bg) {
  const png = decodePng(readFileSync(file));
  writeFileSync(file, encodeRgbPng(png.width, png.height, flattenToRgb(png, bg)));
  return png;
}

// ---------- Browser ----------

function findBrowser(explicit) {
  if (explicit) return existsSync(explicit) ? explicit : null;
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  if (process.platform === 'win32') {
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean)) {
      candidates.push(join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'), join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), join(base, 'Chromium', 'Application', 'chrome.exe'));
    }
  } else if (process.platform === 'darwin') {
    for (const app of ['Google Chrome', 'Microsoft Edge', 'Chromium']) candidates.push(`/Applications/${app}.app/Contents/MacOS/${app}`);
  } else {
    for (const dir of (process.env.PATH ?? '').split(delimiter)) {
      for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable']) candidates.push(join(dir, name));
    }
  }
  return candidates.find((p) => p && existsSync(p)) ?? null;
}

function launch(browserPath, profileDir) {
  const args = [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--hide-scrollbars', '--mute-audio', '--disable-background-networking', '--disable-sync',
    '--disable-component-update', '--force-color-profile=srgb', 'about:blank',
  ];
  const child = spawn(browserPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  return new Promise((resolveUrl, reject) => {
    let text = '';
    const timer = setTimeout(() => reject(new Error(`browser did not report a DevTools URL within 20 s. Output:\n${text}`)), 20000);
    child.stderr.on('data', (d) => {
      text += d;
      const m = text.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolveUrl({ child, wsUrl: m[1] });
      }
    });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`browser exited with code ${code} before DevTools started. Output:\n${text}`)); });
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { ok, fail, method } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? fail(new Error(`${method}: ${msg.error.message}`)) : ok(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }
  static open(url) {
    return new Promise((ok, fail) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => ok(new Cdp(ws)), { once: true });
      ws.addEventListener('error', () => fail(new Error(`cannot connect to ${url}`)), { once: true });
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((ok, fail) => this.pending.set(id, { ok, fail, method }));
  }
  waitEvent(method, sessionId, ms) {
    return new Promise((ok, fail) => {
      const timer = setTimeout(() => { this.listeners.delete(l); fail(new Error(`timed out after ${ms} ms waiting for ${method}`)); }, ms);
      const l = (msg) => {
        if (msg.method === method && msg.sessionId === sessionId) {
          clearTimeout(timer);
          this.listeners.delete(l);
          ok(msg.params);
        }
      };
      this.listeners.add(l);
    });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Runs in the page: find an element by CSS selector or "text=Exact label".
const FIND = `(sel) => {
  if (sel.startsWith('text=')) {
    const want = sel.slice(5).trim();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let hit = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeValue.trim() === want && n.parentElement && n.parentElement.getClientRects().length) hit = n.parentElement;
    }
    return hit;
  }
  return document.querySelector(sel);
}`;

async function evaluate(cdp, session, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, session);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}

async function waitForSelector(cdp, session, sel, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evaluate(cdp, session, `!!(${FIND})(${JSON.stringify(sel)})`)) return;
    await sleep(100);
  }
  throw new Error(`"${sel}" not found within ${ms} ms`);
}

async function click(cdp, session, sel) {
  await waitForSelector(cdp, session, sel, 10000);
  const pt = await evaluate(cdp, session, `(() => { const el = (${FIND})(${JSON.stringify(sel)}); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }, session);
  }
}

async function settle(cdp, session, ms) {
  await evaluate(cdp, session, `(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`);
  await sleep(ms);
}

function seedScript(entries) {
  const sets = Object.entries(entries).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(typeof v === 'string' ? v : JSON.stringify(v))});`).join('');
  return `try { if (!sessionStorage.getItem('__storeReadySeeded')) { localStorage.clear(); ${sets} sessionStorage.setItem('__storeReadySeeded', '1'); } } catch (e) {}`;
}

async function runSet(cdp, plan, set, shots, entries, bg) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const failures = [];
  try {
    await cdp.send('Page.enable', {}, s);
    await cdp.send('Runtime.enable', {}, s);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: set.width, height: set.height, deviceScaleFactor: set.scale, mobile: !!set.mobile }, s);
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: bg[0], g: bg[1], b: bg[2], a: 1 } }, s);
    if (set.userAgent) await cdp.send('Emulation.setUserAgentOverride', { userAgent: set.userAgent }, s);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript(entries) }, s);
    for (const shot of shots) {
      const label = `${set.name}/${shot.file}`;
      try {
        if (shot.reseed) await evaluate(cdp, s, `sessionStorage.removeItem('__storeReadySeeded')`).catch(() => {});
        if (shot.route !== undefined) {
          const url = new URL(shot.route, plan.baseUrl.endsWith('/') ? plan.baseUrl : `${plan.baseUrl}/`).href;
          const loaded = cdp.waitEvent('Page.loadEventFired', s, 30000);
          const nav = await cdp.send('Page.navigate', { url }, s);
          if (nav.errorText) throw new Error(`cannot open ${url}: ${nav.errorText}`);
          await loaded;
        }
        await settle(cdp, s, 100);
        for (const sel of [].concat(shot.click ?? [])) {
          await click(cdp, s, sel);
          await settle(cdp, s, shot.clickDelay ?? 400);
        }
        if (shot.waitFor) await waitForSelector(cdp, s, shot.waitFor, shot.timeout ?? 10000);
        await settle(cdp, s, shot.delay ?? 500);
        const { cssVisualViewport: vv } = await cdp.send('Page.getLayoutMetrics', {}, s);
        const shotData = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
          clip: { x: vv.pageX, y: vv.pageY, width: set.width, height: set.height, scale: 1 },
        }, s);
        const png = decodePng(Buffer.from(shotData.data, 'base64'));
        const want = [Math.round(set.width * set.scale), Math.round(set.height * set.scale)];
        if (png.width !== want[0] || png.height !== want[1]) throw new Error(`captured ${png.width}x${png.height}, expected ${want[0]}x${want[1]}`);
        const file = resolve(set.out, shot.file);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, encodeRgbPng(png.width, png.height, flattenToRgb(png, bg)));
        console.log(`saved ${label}  ${png.width}x${png.height} RGB  ${file}`);
      } catch (e) {
        failures.push(`${label}: ${e.message}`);
        console.error(`FAILED ${label}: ${e.message}`);
      }
    }
  } finally {
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
  }
  return failures;
}

function usage(code, message) {
  if (message) console.error(message);
  console.log('Usage: node capture.mjs <plan.json> [--browser <path>] [--only <set>[,<set>]]');
  console.log('       node capture.mjs --flatten <file.png> [...] [--background "#ffffff"]');
  console.log('Plan format: see the comment at the top of this script, or references/capture.md.');
  process.exit(code);
}

function readJson(path) {
  const text = readFileSync(path, 'utf8');
  return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
}

function loadPlan(planPath) {
  let plan;
  try {
    plan = readJson(planPath);
  } catch (e) {
    usage(2, `Cannot read plan ${planPath}: ${e.message}`);
  }
  const problems = [];
  if (typeof plan.baseUrl !== 'string' || !/^https?:\/\//.test(plan.baseUrl)) problems.push('"baseUrl" must be an http(s) URL, for example "http://localhost:8081"');
  if (!Array.isArray(plan.sets) || !plan.sets.length) problems.push('"sets" must be a non-empty list');
  if (!Array.isArray(plan.shots) || !plan.shots.length) problems.push('"shots" must be a non-empty list');
  for (const set of plan.sets ?? []) {
    if (set.size) {
      if (!SIZES[set.size]) problems.push(`set "${set.name}": unknown size "${set.size}"; known: ${Object.keys(SIZES).join(', ')}, or give width, height and scale`);
      else Object.assign(set, { ...SIZES[set.size], ...set });
    }
    if (!set.name || !set.out) problems.push('every set needs "name" and "out"');
    if (!(set.width > 0 && set.height > 0 && set.scale > 0)) problems.push(`set "${set.name}": needs "size" or positive "width", "height" and "scale"`);
  }
  for (const shot of plan.shots ?? []) if (!shot.file || !/\.png$/i.test(shot.file)) problems.push(`every shot needs a "file" ending in .png (got ${JSON.stringify(shot.file)})`);
  if (problems.length) usage(2, `Plan problems:\n- ${problems.join('\n- ')}`);
  let entries = {};
  if (plan.seed) {
    const seedPath = resolve(dirname(planPath), plan.seed);
    try {
      entries = readJson(seedPath);
    } catch (e) {
      usage(2, `Cannot read seed file ${seedPath}: ${e.message}`);
    }
  }
  entries = { ...entries, ...(plan.localStorage ?? {}) };
  return { plan, entries };
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes('-h') || argv.includes('--help')) usage(argv.length ? 0 : 2);
  const opt = (name) => {
    const i = argv.indexOf(name);
    if (i === -1) return undefined;
    const v = argv[i + 1];
    if (!v || v.startsWith('--')) usage(2, `${name} needs a value`);
    argv.splice(i, 2);
    return v;
  };

  if (argv[0] === '--flatten') {
    const bg = parseColor(opt('--background'));
    const files = argv.slice(1);
    if (!files.length) usage(2, '--flatten needs at least one PNG file');
    let failed = 0;
    for (const f of files) {
      try {
        const png = flattenFile(f, bg);
        console.log(`flattened ${f}  ${png.width}x${png.height} -> RGB`);
      } catch (e) {
        failed++;
        console.error(`FAILED ${f}: ${e.message}`);
      }
    }
    process.exit(failed ? 1 : 0);
  }

  const browserArg = opt('--browser');
  const only = opt('--only')?.split(',').map((s) => s.trim());
  const rest = argv;
  const unknown = rest.filter((a) => a.startsWith('-'));
  if (unknown.length) usage(2, `Unknown option(s): ${unknown.join(' ')}`);
  if (rest.length !== 1) usage(2, 'Give exactly one plan file.');
  const planPath = resolve(rest[0]);
  const { plan, entries } = loadPlan(planPath);
  const bg = parseColor(plan.background);

  if (typeof WebSocket === 'undefined') {
    console.error(`This Node (${process.version}) has no global WebSocket, which capture needs; Node 22 or later has it.`);
    console.error('Options: install Node 22+ and re-run; or capture with the headless command line in references/capture.md (it cannot seed storage or tap);');
    console.error('or use Playwright or Puppeteer if the project already has one. "node capture.mjs --flatten <file.png>" works on this Node.');
    process.exit(2);
  }

  const browserPath = findBrowser(browserArg);
  if (!browserPath) {
    console.error(browserArg ? `No browser at --browser ${browserArg}.` : 'No Chrome or Edge found. Looked in the standard install folders' + (process.platform === 'linux' ? ' and PATH' : '') + '.');
    console.error('Install Google Chrome or Microsoft Edge, or pass --browser <path to chrome or msedge>, or set CHROME_PATH.');
    process.exit(2);
  }

  const sets = plan.sets.filter((s) => !only || only.includes(s.name));
  if (!sets.length) usage(2, `--only matched no set; sets are: ${plan.sets.map((s) => s.name).join(', ')}`);

  const profileDir = mkdtempSync(join(tmpdir(), 'store-ready-capture-'));
  let child;
  const failures = [];
  try {
    const launched = await launch(browserPath, profileDir);
    child = launched.child;
    const cdp = await Cdp.open(launched.wsUrl);
    console.log(`browser: ${browserPath}`);
    for (const set of sets) {
      const shots = plan.shots.filter((sh) => !sh.sets || sh.sets.includes(set.name));
      console.log(`set ${set.name}: ${set.width}x${set.height} CSS px at ${set.scale}x -> ${set.width * set.scale}x${set.height * set.scale}, ${shots.length} shot(s)`);
      failures.push(...(await runSet(cdp, plan, set, shots, entries, bg)));
    }
    await cdp.send('Browser.close').catch(() => {});
    cdp.ws.close();
  } catch (e) {
    failures.push(e.message);
    console.error(`FAILED: ${e.message}`);
  } finally {
    if (child && child.exitCode === null) child.kill();
    await sleep(500);
    try { rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  }
  if (failures.length) {
    console.error(`\n${failures.length} problem(s). Fix them, then run check-sizes.mjs on the output.`);
    process.exit(1);
  }
  console.log('\nDone. Now run check-sizes.mjs, and open every image.');
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
