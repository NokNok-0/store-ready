import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isObject } from '../fs-utils.js';
import { lineAt } from '../project/code-scan.js';
import { SOURCES } from '../sources.js';
import { configFileName, nonEmptyString, pluginOptions, truncate } from './expo-helpers.js';

export const id = 'app.template-content';
export const title = 'Template artwork and placeholder text';
export const source = SOURCES.appleGuidelines;

/**
 * SHA-256 of the image files that ship with Expo project templates. Add new SDK templates here.
 * @type {readonly { template: string, file: string, sha256: string }[]}
 */
export const TEMPLATE_ASSETS = Object.freeze([
  { template: 'Expo SDK 58 default template', file: 'icon.png', sha256: '7a667804bb80a6a424a5daf18a2599c4f32237cf06fe78fc0de45dbb09e0eccf' },
  { template: 'Expo SDK 58 default template', file: 'splash-icon.png', sha256: '27b060a757a29038c9618586baa0ba3894dbe60d084c6059df497ff429c2d92f' },
  { template: 'Expo SDK 58 default template', file: 'android-icon-foreground.png', sha256: '9e3d0315a33c6799de601dd34cd8bf8cc3a8d16f3bf75592baec2ceb7240b391' },
  { template: 'Expo SDK 58 default template', file: 'android-icon-background.png', sha256: 'fb139c2dee362ebf2070e23b96da6fc0d43f8492de38b8af1fd7223e19b5861d' },
  { template: 'Expo SDK 58 default template', file: 'android-icon-monochrome.png', sha256: '6371fc2c12e33ad2215a86c281db3d682a81bebe7c957a842c13b8bf00cceb83' },
  { template: 'Expo SDK 58 default template', file: 'favicon.png', sha256: 'a4e030697a7571b3e95d31860e4da55d2f98e5e861e2b55e414f45a8556828ba' },
]);

/**
 * Placeholder text. `where` limits a pattern: 'code' (string literals and JSX in the code scan, comments
 * and placeholder= hints removed), 'jsx-text' (JSX text and title/label/text props only), 'store' (store text files).
 * @type {{ label: string, pattern: RegExp, where: ('code' | 'jsx-text' | 'store')[] }[]}
 */
export const PLACEHOLDER_PATTERNS = [
  { label: 'example.com address', pattern: /\b[\w.+-]+@(?:[\w-]+\.)*(?:example\.(?:com|org)|test\.com)\b|\bhttps?:\/\/(?:[\w-]+\.)*(?:example\.(?:com|org)|test\.com)\b[^\s'"`<>)]*/i, where: ['code', 'store'] },
  { label: '"lorem ipsum"', pattern: /\blorem ipsum\b/i, where: ['code', 'store'] },
  { label: '"coming soon"', pattern: /\bcoming soon\b/i, where: ['code', 'store'] },
  { label: '"not available yet"', pattern: /\bnot (?:available yet|yet available)\b/i, where: ['code', 'store'] },
  { label: '"TODO"', pattern: /\bTODO\b/, where: ['jsx-text', 'store'] },
  { label: 'unfilled {{TEMPLATE}} field', pattern: /\{\{\s*[A-Z][A-Z0-9_]*\s*\}\}/, where: ['store'] },
];

/** Store text that is pasted into the consoles. Markdown working notes in store/ are not scanned. */
export const STORE_TEXT_FILES = ['store/listing.ios.json', 'store/listing.android.json', 'store/review-notes.txt'];
const STORE_TEXT_GLOB = /^[^/]+\.txt$/;
const MAX_ASSET_BYTES = 20 * 1024 * 1024;
const MAX_FINDINGS = 6;

/** @typedef {{ label: string, file: string, line: number, text: string }} Finding */

/**
 * Every image path the app config or native project configures as an icon, splash image or favicon.
 * @param {import('../project/load-project.js').Project} project
 * @returns {{ field: string, file: string }[]}
 */
export function configuredArtwork(project) {
  /** @type {{ field: string, file: string }[]} */
  const found = [];
  /** @param {string} field @param {unknown} value */
  const add = (field, value) => {
    const file = nonEmptyString(value);
    if (file && !found.some((entry) => entry.file === file)) found.push({ field, file });
  };
  if (project.expo.isExpo) {
    const config = project.expo.config;
    add('icon', config.icon);
    const iosIcon = config.ios?.icon;
    if (isObject(iosIcon)) for (const [key, value] of Object.entries(iosIcon)) add(`ios.icon.${key}`, value);
    else add('ios.icon', iosIcon);
    add('android.icon', config.android?.icon);
    const adaptive = isObject(config.android?.adaptiveIcon) ? config.android.adaptiveIcon : {};
    for (const key of ['foregroundImage', 'backgroundImage', 'monochromeImage']) add(`android.adaptiveIcon.${key}`, adaptive[key]);
    for (const [prefix, splash] of [['splash', config.splash], ['ios.splash', config.ios?.splash], ['android.splash', config.android?.splash]]) {
      if (isObject(splash)) add(`${prefix}.image`, splash.image);
    }
    add('web.favicon', config.web?.favicon);
    pluginOptions(config, 'expo-splash-screen').forEach((options) => {
      add('expo-splash-screen image', options.image);
      if (isObject(options.dark)) add('expo-splash-screen dark.image', options.dark.image);
      for (const platform of ['ios', 'android']) {
        if (isObject(options[platform])) {
          add(`expo-splash-screen ${platform}.image`, options[platform].image);
          if (isObject(options[platform].dark)) add(`expo-splash-screen ${platform}.dark.image`, options[platform].dark.image);
        }
      }
    });
  }
  for (const set of project.ios.appIconSets) {
    const images = Array.isArray(set.data?.images) ? set.data.images : [];
    for (const image of images) {
      if (isObject(image) && typeof image.filename === 'string') add(set.file, `${set.dir}/${image.filename}`);
    }
  }
  return found;
}

/** @param {string} absolute */
function sha256(absolute) {
  if (fs.statSync(absolute).size > MAX_ASSET_BYTES) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
}

/**
 * @param {import('../project/load-project.js').Project} project
 * @param {readonly { template: string, file: string, sha256: string }[]} [assets]
 * @returns {{ field: string, file: string, template: string, templateFile: string }[]}
 */
export function findTemplateArtwork(project, assets = TEMPLATE_ASSETS) {
  const matches = [];
  for (const { field, file } of configuredArtwork(project)) {
    const absolute = project.files.resolve(file);
    if (!absolute || !project.files.isFile(file)) continue;
    let hash;
    try {
      hash = sha256(absolute);
    } catch {
      continue;
    }
    const known = assets.find((asset) => asset.sha256 === hash);
    if (known) matches.push({ field, file: project.files.relative(absolute), template: known.template, templateFile: known.file });
  }
  return matches;
}

/**
 * Replaces comments and placeholder="..." hints with spaces, keeping offsets and line numbers.
 * @param {string} text
 */
export function maskNonUserText(text) {
  const blank = (/** @type {string} */ match) => match.replace(/[^\n]/g, ' ');
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:\\'"`])\/\/[^\n]*/g, (match, before) => before + blank(match.slice(before.length)))
    .replace(/\bplaceholder\s*=\s*(?:"[^"\n]*"|'[^'\n]*'|\{\s*(?:"[^"\n]*"|'[^'\n]*'|`[^`\n]*`)\s*\})/g, blank)
    .replace(/\bplaceholder\s*:\s*(?:"[^"\n]*"|'[^'\n]*'|`[^`\n]*`)/g, blank);
}

/** JSX text between tags, and string values of props that are shown as text. */
const JSX_TEXT = /<[A-Za-z][^<>]*>([^<>{}]+)<|\b(?:title|label|text|message|subtitle|description|header|headerTitle|accessibilityLabel)\s*=\s*(?:"([^"\n]*)"|'([^'\n]*)'|\{\s*["'`]([^"'`\n]*)["'`]\s*\})/g;

/** @param {import('../project/load-project.js').Project} project @returns {Finding[]} */
function scanCode(project) {
  /** @type {Finding[]} */
  const findings = [];
  for (const { file, text } of project.code.files()) {
    const masked = maskNonUserText(text);
    for (const placeholder of PLACEHOLDER_PATTERNS) {
      if (placeholder.where.includes('code')) {
        const match = new RegExp(placeholder.pattern.source, placeholder.pattern.flags.replace('g', '')).exec(masked);
        if (match) findings.push({ label: placeholder.label, file, line: lineAt(masked, match.index), text: match[0] });
      }
      if (placeholder.where.includes('jsx-text')) {
        for (const jsx of masked.matchAll(JSX_TEXT)) {
          const value = jsx[1] ?? jsx[2] ?? jsx[3] ?? jsx[4] ?? '';
          const inner = placeholder.pattern.exec(value);
          if (inner) {
            findings.push({ label: placeholder.label, file, line: lineAt(masked, jsx.index ?? 0), text: value.trim() });
            break;
          }
        }
      }
    }
  }
  return findings;
}

/** @param {import('../project/load-project.js').Project} project @returns {Finding[]} */
function scanStore(project) {
  const files = new Set(STORE_TEXT_FILES);
  if (project.files.isDirectory('store')) {
    for (const absolute of project.files.walk('store', { maxDepth: 0 })) {
      if (STORE_TEXT_GLOB.test(path.basename(absolute))) files.add(project.files.relative(absolute));
    }
  }
  /** @type {Finding[]} */
  const findings = [];
  for (const file of files) {
    const text = project.files.readText(file);
    if (text === null) continue;
    for (const placeholder of PLACEHOLDER_PATTERNS) {
      if (!placeholder.where.includes('store')) continue;
      const match = new RegExp(placeholder.pattern.source, placeholder.pattern.flags.replace('g', '')).exec(text);
      if (match) findings.push({ label: placeholder.label, file, line: lineAt(text, match.index), text: match[0] });
    }
  }
  return findings;
}

/**
 * Which store a file belongs to: store files named for one platform (and App Store review notes) count
 * for that store only; code and other files count for both.
 * @param {string} file
 * @returns {'ios' | 'android' | 'both'}
 */
export function storeFilePlatform(file) {
  if (!file.startsWith('store/')) return 'both';
  if (/\.ios\.[^/]+$/.test(file) || file === 'store/review-notes.txt') return 'ios';
  if (/\.android\.[^/]+$/.test(file)) return 'android';
  return 'both';
}

/** @param {import('../project/load-project.js').Project} project @returns {Finding[]} */
export function findPlaceholders(project) {
  return [...scanCode(project), ...scanStore(project)];
}

/**
 * @param {import('../project/load-project.js').Project} project
 * @param {readonly { template: string, file: string, sha256: string }[]} [assets] hash table (tests pass their own)
 */
export function run(project, assets = TEMPLATE_ASSETS) {
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  const platforms = /** @type {('ios' | 'android')[]} */ (['ios', 'android']).filter((platform) => project.platforms.has(platform));

  const artwork = findTemplateArtwork(project, assets);
  if (artwork.length > 0) {
    const list = artwork.map((entry) => `${entry.file} (${entry.field}) is the ${entry.template} ${entry.templateFile}`).join('; ');
    const message = `Template artwork: ${list}. Shipping the template's icon or splash image reads as an unfinished app and is not your own brand.`;
    for (const platform of platforms) {
      issues.push({
        severity: 'error',
        platform,
        message,
        fix: platform === 'ios'
          ? 'Replace every listed image with your own artwork (icon 1024x1024). Guidelines 4.1(c) and 2.3 expect an original icon and accurate metadata.'
          : "Replace every listed image with your own artwork. Play's impersonation and metadata policies expect the icon and graphics to be your own.",
        source: platform === 'ios' ? SOURCES.appleGuidelines : SOURCES.playPolicy,
        file: project.expo.isExpo ? configFileName(project) : artwork[0].file,
      });
    }
  }

  const all = findPlaceholders(project);
  for (const platform of platforms) {
    const findings = all.filter((finding) => storeFilePlatform(finding.file) === 'both' || storeFilePlatform(finding.file) === platform);
    if (findings.length === 0) continue;
    const shown = findings.slice(0, MAX_FINDINGS).map((finding) => `${finding.label} in ${finding.file}:${finding.line} (${JSON.stringify(truncate(finding.text.replace(/\s+/g, ' '), 50))})`).join('; ');
    const more = findings.length > MAX_FINDINGS ? ` and ${findings.length - MAX_FINDINGS} more` : '';
    const message = `Placeholder content: ${shown}${more}. Reviewers treat placeholder text, sample accounts and "coming soon" features as an incomplete app.`;
    issues.push({
      severity: 'warning',
      platform,
      message,
      fix: `${platform === 'ios' ? 'Guideline 2.1: ship' : 'Play minimum functionality: ship'} finished content. Replace sample addresses and text with real ones, remove features that do not work yet, and fill in template fields. Format hints in placeholder= props and test files are not flagged.`,
      source: platform === 'ios' ? SOURCES.appleGuidelines : SOURCES.playMinimumFunctionality,
      file: findings[0].file,
    });
  }
  return issues;
}
