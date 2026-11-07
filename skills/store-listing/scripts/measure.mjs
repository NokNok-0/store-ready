#!/usr/bin/env node
// Measures store/listing.ios.json and store/listing.android.json against store limits.
// Usage: node measure.mjs [projectDir | listing.json ...] [--allow "best streak"] ...
//   --allow  a UI label that contains a flagged word, accepted in descriptions only (repeat the flag, or separate with commas).
//            Never accepted in name, subtitle or title.
// Exit codes: 0 all fields within limits, 1 a field is over/under its limit or malformed, 2 nothing to measure.
// Limits: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
//         https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
//         https://support.google.com/googleplay/android-developer/answer/9859152

import { readFile, stat } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

const FIELDS = {
  ios: [
    { key: 'name', min: 2, max: 30, unit: 'chars', required: true },
    { key: 'subtitle', max: 30, unit: 'chars' },
    { key: 'keywords', max: 100, unit: 'bytes' },
    { key: 'promotionalText', max: 170, unit: 'chars' },
    { key: 'description', max: 4000, unit: 'chars', required: true },
    { key: 'whatsNew', max: 4000, unit: 'chars' },
  ],
  android: [
    { key: 'title', max: 30, unit: 'chars', required: true },
    { key: 'shortDescription', max: 80, unit: 'chars', required: true },
    { key: 'fullDescription', max: 4000, unit: 'chars', required: true },
  ],
};

// Same lists as the checker's OPTIONAL_KEYS in cli/src/checks/store-listing-limits.js.
const OPTIONAL_KEYS = {
  ios: ['privacyPolicyUrl', 'supportUrl', 'marketingUrl', 'primaryCategory', 'secondaryCategory'],
  android: ['privacyPolicyUrl', 'category', 'tags'],
};
const URL_KEYS = ['privacyPolicyUrl', 'supportUrl', 'marketingUrl'];
const SHORT_FIELDS = new Set(['name', 'subtitle', 'title']);
// Price and superlative words. The store-ready checker (cli/src/checks/store-listing-limits.js CLAIM_WORDS) flags
// free, sale, % off, $, €, best, top, ultimate, #1, number one and No. 1 in name, subtitle and title. This script
// flags all of those in the same fields, plus more superlatives in every field; in descriptions it accepts --allow labels.
const SUPERLATIVES = /\b(best|ultimate|revolutionary|leading|fastest|easiest|top[- ]rated|number one|world'?s (first|best)|unbeatable|perfect|amazing|incredible)\b|#1\b/gi;
const SHORT_ONLY_CLAIMS = /\btop\b|\bno\.\s?1(?!\d)|[$€]/gi;
const PRICE = /[$€£¥₹]\s?\d|\d\s?(usd|eur|gbp)\b|\b\d+% off\b/gi;
const PRICE_WORDS = /\b(free|sale|discount|cheap|deal)\b/gi;
const EMOJI = /\p{Extended_Pictographic}/u;
const HTML = /<\/?[a-z][^>]*>/i;
const OTHER_PLATFORMS_IOS = /\b(android|google play|play store)\b/i;

const chars = (s) => [...s].length;
const bytes = (s) => Buffer.byteLength(s, 'utf8');
const words = (s) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2);

async function exists(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

function platformOf(file, data) {
  const name = basename(file).toLowerCase();
  if (name.includes('.ios.')) return 'ios';
  if (name.includes('.android.')) return 'android';
  if (data && typeof data === 'object') {
    if ('keywords' in data || 'subtitle' in data) return 'ios';
    if ('shortDescription' in data || 'fullDescription' in data) return 'android';
  }
  return null;
}

function keywordWarnings(kw, name) {
  const out = [];
  if (!kw) return out;
  const parts = kw.split(',');
  const wasted = parts.reduce((n, p) => n + (bytes(p) - bytes(p.trim())), 0);
  if (wasted) out.push(`spaces around commas waste ${wasted} byte(s): write "a,b,c", not "a, b, c"`);
  const trimmed = parts.map((p) => p.trim());
  if (trimmed.some((p) => p === '')) out.push('empty entry (double comma or trailing comma)');
  const seen = new Map();
  for (const p of trimmed.filter(Boolean)) {
    const k = p.toLowerCase();
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  const dups = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
  if (dups.length) out.push(`duplicate keyword(s): ${dups.join(', ')}`);
  const nameWords = new Set(words(name || ''));
  const inName = [...new Set(trimmed.flatMap((p) => words(p)).filter((w) => nameWords.has(w)))];
  if (inName.length) out.push(`word(s) already in the name: ${inName.join(', ')}`);
  return out;
}

// Returns matches of re in value that are not inside an allowed phrase (case-insensitive), and the allowed ones.
function flagged(re, value, allow) {
  const lower = value.toLowerCase();
  const spans = [];
  for (const phrase of allow) {
    for (let i = lower.indexOf(phrase); i !== -1; i = lower.indexOf(phrase, i + 1)) spans.push([i, i + phrase.length, phrase]);
  }
  const hits = [];
  const allowed = [];
  for (const m of value.matchAll(re)) {
    const span = spans.find(([s, e]) => m.index >= s && m.index + m[0].length <= e);
    (span ? allowed : hits).push(span ? { word: m[0], phrase: span[2] } : m[0]);
  }
  return { hits, allowed };
}

function textWarnings(platform, key, value, allow, notes) {
  const out = [];
  if (!value) return out;
  const short = SHORT_FIELDS.has(key);
  const accept = short ? [] : allow;
  const sup = flagged(SUPERLATIVES, value, accept);
  if (sup.hits.length) out.push(`superlative or ranking claim: "${sup.hits[0]}"${short ? ' (the store-ready checker flags this too)' : ''}`);
  const price = flagged(PRICE, value, accept);
  if (price.hits.length) out.push(`looks like a price or discount: "${price.hits[0]}"`);
  if (short) {
    const claims = flagged(SHORT_ONLY_CLAIMS, value, []);
    if (claims.hits.length) out.push(`"${claims.hits[0]}" in the name, subtitle or title reads as a ranking or price claim (the store-ready checker flags this too)`);
    const words = flagged(PRICE_WORDS, value, []);
    if (words.hits.length) out.push(platform === 'ios' ? `"${words.hits[0]}" in the name or subtitle reads as a price (2.3.7)` : `"${words.hits[0]}" in the title reads as a price claim`);
  }
  for (const a of [...sup.allowed, ...price.allowed]) notes.push(`${key}: "${a.word}" accepted as part of the UI label "${a.phrase}" (--allow)`);
  if (EMOJI.test(value)) out.push('contains emoji');
  if ((key === 'description' || key === 'fullDescription') && HTML.test(value)) out.push('contains HTML-like tags; the field is plain text');
  if (platform === 'ios') {
    const other = value.match(OTHER_PLATFORMS_IOS);
    if (other) out.push(`names another platform: "${other[0]}" (2.3.10)`);
  }
  return out;
}

function measure(platform, data, allow) {
  const rows = [];
  const errors = [];
  const warnings = [];
  const notes = [];
  const known = new Set(FIELDS[platform].map((f) => f.key));

  const optional = OPTIONAL_KEYS[platform];
  for (const key of Object.keys(data)) {
    if (!known.has(key) && !optional.includes(key)) {
      warnings.push(`${key}: unexpected key; the listing shape allows only ${[...known, ...optional].join(', ')}`);
    }
  }
  for (const key of URL_KEYS) {
    if (optional.includes(key) && key in data && !(typeof data[key] === 'string' && /^https:\/\/[^\s/]+\.[^\s]+$/.test(data[key]))) {
      warnings.push(`${key}: not an https URL`);
    }
  }
  if (platform === 'android' && 'tags' in data) {
    const tags = data.tags;
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) warnings.push('tags: must be a list of strings');
    else if (tags.length > 5) warnings.push(`tags: ${tags.length} tags; Google Play allows at most 5`);
  }

  for (const f of FIELDS[platform]) {
    if (!(f.key in data)) {
      if (f.min) errors.push(`${f.key}: missing; it needs ${f.min}-${f.max} ${f.unit}`);
      else if (f.required) warnings.push(`${f.key}: missing; the store needs it before submission`);
      else warnings.push(`${f.key}: missing; add it, with "" if the field is unused`);
      rows.push({ key: f.key, text: 'missing', status: f.min ? 'ERROR' : 'missing' });
      continue;
    }
    const value = data[f.key];
    if (typeof value !== 'string') {
      errors.push(`${f.key}: must be a string, got ${Array.isArray(value) ? 'array' : typeof value}`);
      rows.push({ key: f.key, text: 'not a string', status: 'ERROR' });
      continue;
    }
    const n = f.unit === 'bytes' ? bytes(value) : chars(value);
    let status = 'ok';
    if (n > f.max) {
      status = `OVER by ${n - f.max}`;
      errors.push(`${f.key}: ${n} ${f.unit}, limit ${f.max}`);
    } else if (f.min && n < f.min) {
      status = `UNDER minimum ${f.min}`;
      errors.push(`${f.key}: ${n} ${f.unit}, minimum ${f.min}`);
    } else if (n === 0) {
      status = 'empty';
      if (f.required) warnings.push(`${f.key}: empty; the store needs it before submission`);
    } else if (n > f.max * 0.95) {
      status = 'ok (near limit)';
    }
    let text = `${String(n).padStart(4)} / ${String(f.max).padEnd(4)} ${f.unit}`;
    if (f.unit === 'chars' && value.length !== n) text += `  (${value.length} UTF-16 units; the console may count differently)`;
    if (f.unit === 'bytes') text += `  (${chars(value)} chars)`;
    rows.push({ key: f.key, text, status });

    if (f.key === 'keywords') for (const w of keywordWarnings(value, data.name)) warnings.push(`keywords: ${w}`);
    for (const w of textWarnings(platform, f.key, value, allow, notes)) warnings.push(`${f.key}: ${w}`);
  }
  return { rows, errors, warnings, notes };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log('Usage: node measure.mjs [projectDir | listing.json ...] [--allow "<UI label>"] ...');
    console.log('Default: reads store/listing.ios.json and store/listing.android.json under the current directory.');
    console.log('--allow: a label the app\'s UI shows that contains a flagged word (for example "best streak").');
    console.log('         Accepted in descriptions, promotional text and what\'s new; never in name, subtitle or title.');
    process.exit(0);
  }
  const allow = [];
  const args = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--allow') {
      if (!argv[i + 1]) {
        console.error('--allow needs a phrase, for example --allow "best streak"');
        process.exit(2);
      }
      allow.push(...argv[++i].split(',').map((p) => p.trim().toLowerCase()).filter(Boolean));
    } else if (argv[i].startsWith('--allow=')) {
      allow.push(...argv[i].slice(8).split(',').map((p) => p.trim().toLowerCase()).filter(Boolean));
    } else if (argv[i].startsWith('-')) {
      console.error(`Unknown option ${argv[i]}. Run with --help.`);
      process.exit(2);
    } else {
      args.push(argv[i]);
    }
  }

  let files;
  const jsonArgs = args.filter((a) => a.toLowerCase().endsWith('.json'));
  if (jsonArgs.length) {
    files = jsonArgs.map((a) => resolve(a));
  } else {
    const root = resolve(args[0] || '.');
    files = [join(root, 'store', 'listing.ios.json'), join(root, 'store', 'listing.android.json')];
  }

  let measured = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (const file of files) {
    const shown = relative(process.cwd(), file) || file;
    if (!(await exists(file))) {
      console.log(`${shown}: not found, skipped\n`);
      continue;
    }
    console.log(shown);
    let data;
    try {
      data = JSON.parse(await readFile(file, 'utf8'));
    } catch (e) {
      console.log(`  ERROR invalid JSON: ${e.message}\n`);
      errorCount++;
      measured++;
      continue;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      console.log('  ERROR top level must be a JSON object\n');
      errorCount++;
      measured++;
      continue;
    }
    const platform = platformOf(file, data);
    if (!platform) {
      console.log('  ERROR cannot tell whether this is the iOS or Android listing; name it listing.ios.json or listing.android.json\n');
      errorCount++;
      measured++;
      continue;
    }
    measured++;
    const { rows, errors, warnings, notes } = measure(platform, data, allow);
    const width = Math.max(...rows.map((r) => r.key.length));
    for (const r of rows) console.log(`  ${r.key.padEnd(width)}  ${r.text}  ${r.status}`);
    for (const e of errors) console.log(`  ERROR ${e}`);
    for (const w of warnings) console.log(`  warn  ${w}`);
    for (const n of notes) console.log(`  note  ${n}`);
    console.log('');
    errorCount += errors.length;
    warningCount += warnings.length;
  }

  if (measured === 0) {
    console.log('No listing files found. Expected store/listing.ios.json and/or store/listing.android.json.');
    process.exit(2);
  }
  console.log(`${errorCount} error(s), ${warningCount} warning(s)`);
  process.exit(errorCount ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
