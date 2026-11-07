#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const USAGE = `Usage: node list-permissions.mjs [project-root] [--config <expo-config.json>] [--manifest <merged-manifest.xml>] [--modules <node_modules dir>]

Lists Android permissions from app config, the app manifest and library manifests. Prints JSON.
--config    output of "npx expo config --json", for projects using app.config.js/ts.
--manifest  merged manifest of a release build (e.g. from "bundletool dump manifest"); treated as authoritative.
--modules   node_modules folder to scan when dependencies are hoisted (monorepos).`;

const P = 'android.permission.';

const DECLARATIONS = [
  { match: (p) => p === `${P}READ_MEDIA_IMAGES` || p === `${P}READ_MEDIA_VIDEO`, rule: 'Photo and video permissions: only when the system photo picker cannot support core functionality; declaration required.', source: 'https://support.google.com/googleplay/android-developer/answer/14115180' },
  { match: (p) => p === `${P}ACCESS_BACKGROUND_LOCATION`, rule: 'Background location: declaration for one core feature, demo video of 30 seconds or less showing prominent disclosure and runtime prompt, privacy policy covering location, test credentials if login is needed.', source: 'https://support.google.com/googleplay/android-developer/answer/9799150' },
  { match: (p) => p === `${P}USE_EXACT_ALARM`, rule: 'Only for alarm, timer or calendar apps, with a declaration. Other apps use SCHEDULE_EXACT_ALARM.', source: 'https://support.google.com/googleplay/android-developer/answer/16558241' },
  { match: (p) => p === `${P}SCHEDULE_EXACT_ALARM`, rule: 'User-granted; the app must handle it not being granted. Block it if exact timing is not needed.', source: 'https://support.google.com/googleplay/android-developer/answer/16558241' },
  { match: (p) => p === `${P}FOREGROUND_SERVICE` || p.startsWith(`${P}FOREGROUND_SERVICE_`), rule: 'Foreground services (target 14+): declare each type and its FOREGROUND_SERVICE_* permission; App content needs description, user impact if interrupted, demo video, use case.', source: 'https://support.google.com/googleplay/android-developer/answer/13392821' },
  { match: (p) => p === `${P}USE_FULL_SCREEN_INTENT`, rule: 'Auto-granted only for alarm and calling apps on Android 14+.', source: 'https://play.google/developer-content-policy/' },
  { match: (p) => p === `${P}MANAGE_EXTERNAL_STORAGE`, rule: 'Needs a declaration.', source: 'https://play.google/developer-content-policy/' },
  { match: (p) => p === `${P}QUERY_ALL_PACKAGES`, rule: 'Needs a declaration.', source: 'https://play.google/developer-content-policy/' },
  { match: (p) => p === `${P}BIND_ACCESSIBILITY_SERVICE`, rule: 'Accessibility API use needs a declaration.', source: 'https://play.google/developer-content-policy/' },
];

const DATA_TYPES = {
  [`${P}ACCESS_FINE_LOCATION`]: 'location',
  [`${P}ACCESS_COARSE_LOCATION`]: 'location',
  [`${P}ACCESS_BACKGROUND_LOCATION`]: 'location',
  [`${P}CAMERA`]: 'photos or videos taken in the app',
  [`${P}RECORD_AUDIO`]: 'audio',
  [`${P}READ_CONTACTS`]: 'contacts',
  [`${P}READ_CALENDAR`]: 'calendar events',
  [`${P}READ_MEDIA_IMAGES`]: 'photos',
  [`${P}READ_MEDIA_VIDEO`]: 'videos',
  [`${P}READ_MEDIA_AUDIO`]: 'audio files',
  [`${P}BODY_SENSORS`]: 'health or sensor data',
  [`${P}ACTIVITY_RECOGNITION`]: 'physical activity',
  [`${P}READ_PHONE_STATE`]: 'device or phone identifiers',
  [`${P}READ_SMS`]: 'SMS messages',
  [`${P}READ_CALL_LOG`]: 'call log',
  'com.google.android.gms.permission.AD_ID': 'advertising ID',
};

const MODULE_SKIP = new Set(['.bin', '.cache', 'ios', '__tests__', 'test', 'tests', 'androidTest', 'debug', 'example', 'examples', 'docs', 'build', 'intermediates']);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function rel(root, path) {
  return relative(root, path).split(sep).join('/');
}

function walk(start, skip, visit) {
  const stack = [start];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) stack.push(path);
      } else if (entry.isFile()) {
        visit(path, entry.name);
      }
    }
  }
}

function packageFromPath(path) {
  const parts = path.split(sep);
  const i = parts.lastIndexOf('node_modules');
  if (i === -1 || i + 1 >= parts.length) return null;
  return parts[i + 1].startsWith('@') ? `${parts[i + 1]}/${parts[i + 2]}` : parts[i + 1];
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : null;
}

function parseManifest(xml) {
  const text = xml.replace(/<!--[\s\S]*?-->/g, '');
  const uses = [];
  for (const m of text.matchAll(/<uses-permission(?:-sdk-23)?\b[^>]*>/g)) {
    const name = attr(m[0], 'android:name');
    if (!name) continue;
    uses.push({ name, remove: attr(m[0], 'tools:node') === 'remove', maxSdkVersion: attr(m[0], 'android:maxSdkVersion') });
  }
  const services = [];
  for (const m of text.matchAll(/<service\b[^>]*>/g)) {
    const name = attr(m[0], 'android:name');
    const types = attr(m[0], 'android:foregroundServiceType');
    const permission = attr(m[0], 'android:permission');
    if (types || permission === `${P}BIND_ACCESSIBILITY_SERVICE`) {
      services.push({ name, foregroundServiceType: types, permission });
    }
  }
  const target = text.match(/android:targetSdkVersion\s*=\s*"(\d+)"/);
  return { uses, services, targetSdkVersion: target ? Number(target[1]) : null };
}

function loadAppConfig(root, configPath) {
  if (configPath) {
    const json = readJson(resolve(configPath));
    return json ? { source: configPath, config: json.expo ?? json } : { source: configPath, config: null, error: 'Could not parse --config file as JSON.' };
  }
  const dynamic = ['app.config.js', 'app.config.ts', 'app.config.mjs', 'app.config.cjs'].find((f) => existsSync(join(root, f)));
  if (dynamic) {
    return { source: dynamic, config: null, error: `${dynamic} cannot be read statically. Run "npx expo config --json > expo-config.json" and pass --config expo-config.json.` };
  }
  if (existsSync(join(root, 'app.json'))) {
    const json = readJson(join(root, 'app.json'));
    return json ? { source: 'app.json', config: json.expo ?? json } : { source: 'app.json', config: null, error: 'Could not parse app.json.' };
  }
  return { source: null, config: null };
}

function fullName(p) {
  return p.includes('.') ? p : `${P}${p}`;
}

function targetSdkFromConfig(config) {
  for (const plugin of config?.plugins ?? []) {
    if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
      const value = plugin[1]?.android?.targetSdkVersion;
      if (value) return Number(value);
    }
  }
  return null;
}

function targetSdkFromGradle(root) {
  for (const file of ['android/app/build.gradle', 'android/build.gradle', 'android/gradle.properties', 'android/app/build.gradle.kts', 'android/build.gradle.kts']) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const m = readFileSync(path, 'utf8').match(/targetSdk(?:Version)?\s*[=:]?\s*(\d{2})\b/);
    if (m) return { value: Number(m[1]), from: file };
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);
  let root = process.cwd();
  let configPath = null;
  let manifestPath = null;
  let modulesPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      console.log(USAGE);
      return 0;
    }
    if (args[i] === '--config') configPath = args[++i];
    else if (args[i] === '--manifest') manifestPath = args[++i];
    else if (args[i] === '--modules') modulesPath = args[++i];
    else root = args[i];
  }
  root = resolve(root);
  const warnings = [];

  const pkg = readJson(join(root, 'package.json'));
  const deps = { ...pkg?.dependencies, ...pkg?.optionalDependencies };
  const app = loadAppConfig(root, configPath);
  if (app.error) warnings.push(app.error);
  const android = app.config?.android ?? {};

  const found = new Map();
  const add = (name, source, maxSdkVersion = null) => {
    if (!found.has(name)) found.set(name, new Map());
    const label = maxSdkVersion ? `${source} (maxSdkVersion ${maxSdkVersion})` : source;
    found.get(name).set(label, maxSdkVersion ? Number(maxSdkVersion) : null);
  };
  const removedInManifest = new Set();
  const services = [];

  for (const p of android.permissions ?? []) add(fullName(p), `${app.source}: android.permissions`);
  const blocked = new Set((android.blockedPermissions ?? []).map(fullName));

  const appManifest = join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  let manifestTarget = null;
  if (existsSync(appManifest)) {
    const parsed = parseManifest(readFileSync(appManifest, 'utf8'));
    for (const u of parsed.uses) (u.remove ? removedInManifest.add(u.name) : add(u.name, 'android/app/src/main/AndroidManifest.xml', u.maxSdkVersion));
    services.push(...parsed.services.map((s) => ({ ...s, from: 'android/app/src/main/AndroidManifest.xml' })));
    manifestTarget = parsed.targetSdkVersion;
  } else if (pkg && 'expo' in deps) {
    warnings.push('No android/ folder. Permissions added by config plugins and the Expo template are missing from this list. Run "npx expo prebuild --platform android --no-install" and re-run.');
  }

  const modulesDir = modulesPath ? resolve(modulesPath) : join(root, 'node_modules');
  if (existsSync(modulesDir)) {
    walk(modulesDir, MODULE_SKIP, (path, name) => {
      if (name !== 'AndroidManifest.xml' || !path.split(sep).includes('android')) return;
      const owner = packageFromPath(path);
      const parsed = parseManifest(readFileSync(path, 'utf8'));
      for (const u of parsed.uses) if (!u.remove) add(u.name, `library: ${owner}`, u.maxSdkVersion);
      services.push(...parsed.services.map((s) => ({ ...s, from: `library: ${owner}` })));
    });
  } else {
    warnings.push('node_modules not found. Library manifests were not read; install dependencies and re-run.');
  }

  let authoritative = null;
  if (manifestPath) {
    const xml = readFileSync(resolve(manifestPath), 'utf8');
    const parsed = parseManifest(xml);
    authoritative = { file: manifestPath, permissions: parsed.uses.filter((u) => !u.remove), services: parsed.services, targetSdkVersion: parsed.targetSdkVersion };
  }

  const withMax = (entry, limits) => {
    if (limits.length && limits.every((n) => n !== null)) entry.maxSdkVersion = Math.max(...limits);
    return entry;
  };
  const effective = authoritative
    ? authoritative.permissions.map((u) =>
        withMax({ name: u.name, sources: [u.maxSdkVersion ? `merged manifest (maxSdkVersion ${u.maxSdkVersion})` : 'merged manifest'] }, [u.maxSdkVersion ? Number(u.maxSdkVersion) : null]))
    : [...found.entries()]
        .filter(([name]) => !blocked.has(name) && !removedInManifest.has(name))
        .map(([name, sources]) => withMax({ name, sources: [...sources.keys()] }, [...sources.values()]));
  effective.sort((a, b) => a.name.localeCompare(b.name));

  const needsDeclaration = effective
    .map((p) => {
      const d = DECLARATIONS.find((x) => x.match(p.name));
      return d ? { permission: p.name, sources: p.sources, ...(p.maxSdkVersion ? { maxSdkVersion: p.maxSdkVersion } : {}), rule: d.rule, source: d.source } : null;
    })
    .filter(Boolean);
  const allServices = authoritative ? authoritative.services.map((s) => ({ ...s, from: 'merged manifest' })) : services;
  for (const s of allServices.filter((x) => x.permission === `${P}BIND_ACCESSIBILITY_SERVICE`)) {
    needsDeclaration.push({ permission: `${P}BIND_ACCESSIBILITY_SERVICE`, sources: [s.from], service: s.name, rule: 'Accessibility API use needs a declaration.', source: 'https://play.google/developer-content-policy/' });
  }

  const dataSafety = effective.filter((p) => DATA_TYPES[p.name]).map((p) => ({ permission: p.name, consider: DATA_TYPES[p.name], sources: p.sources, ...(p.maxSdkVersion ? { maxSdkVersion: p.maxSdkVersion } : {}) }));

  const expoMajor = Number(String(deps.expo ?? '').match(/(\d+)/)?.[1] ?? NaN);
  const fromPlugin = targetSdkFromConfig(app.config);
  const fromGradle = targetSdkFromGradle(root);
  let targetSdk = { value: null, from: null };
  if (authoritative?.targetSdkVersion) targetSdk = { value: authoritative.targetSdkVersion, from: 'merged manifest' };
  else if (fromPlugin) targetSdk = { value: fromPlugin, from: 'expo-build-properties android.targetSdkVersion' };
  else if (manifestTarget) targetSdk = { value: manifestTarget, from: 'android/app/src/main/AndroidManifest.xml' };
  else if (fromGradle) targetSdk = fromGradle;
  else if (expoMajor === 58) targetSdk = { value: 36, from: 'Expo SDK 58 default' };
  targetSdk.required = 36;
  targetSdk.ok = targetSdk.value === null ? null : targetSdk.value >= 36;
  targetSdk.source = 'https://developer.android.com/google/play/requirements/target-sdk';
  if (targetSdk.value === null) warnings.push('Target SDK not found. Check the build configuration; new apps and updates must target API 36.');

  const report = {
    tool: 'store-ready play-data-safety list-permissions',
    note: authoritative
      ? 'Permissions are read from the merged manifest you passed.'
      : 'Approximate: built from app config, the app manifest and library manifests. Confirm against a release build merged manifest (--manifest). maxSdkVersion, where present, means the permission is only requested up to that API level.',
    projectRoot: root,
    appConfig: app.source,
    blockedPermissions: [...blocked],
    removedInManifest: [...removedInManifest],
    permissions: effective,
    needsDeclaration,
    dataSafety,
    foregroundServices: allServices.filter((s) => s.foregroundServiceType),
    targetSdk,
    warnings,
  };
  console.log(JSON.stringify(report, null, 2));
  return 0;
}

process.exitCode = main();
