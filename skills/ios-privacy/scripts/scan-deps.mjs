#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const USAGE = `Usage: node scan-deps.mjs [project-root] [--config <expo-config.json>] [--modules <node_modules dir>]

Reads package.json, node_modules and app config. Prints JSON.
--config   output of "npx expo config --json", for projects using app.config.js/ts.
--modules  node_modules folder to scan when dependencies are hoisted (monorepos).`;

const KNOWN_REASONS = {
  NSPrivacyAccessedAPICategoryFileTimestamp: ['DDA9.1', 'C617.1', '3B52.1', '0A2A.1'],
  NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1', '8FFB.1', '3D61.1'],
  NSPrivacyAccessedAPICategoryDiskSpace: ['85F4.1', 'E174.1', '7D9E.1', 'B728.1'],
  NSPrivacyAccessedAPICategoryActiveKeyboards: ['3EC4.1', '54BD.1'],
  NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1', '1C8F.1', 'C56D.1', 'AC6B.1'],
};

const REQUIRED_REASON_HINTS = {
  '@react-native-async-storage/async-storage': {
    category: 'NSPrivacyAccessedAPICategoryUserDefaults',
    note: 'Treated as a UserDefaults signal by store-ready. Read the package iOS source or its PrivacyInfo.xcprivacy to confirm before declaring.',
  },
};

const PERMISSION_HINTS = {
  'expo-camera': ['camera', 'microphone (video recording)'],
  'expo-image-picker': ['photo library', 'camera'],
  'expo-media-library': ['photo library'],
  'expo-location': ['location'],
  'expo-contacts': ['contacts'],
  'expo-calendar': ['calendars', 'reminders'],
  'expo-av': ['microphone'],
  'expo-audio': ['microphone'],
  'expo-local-authentication': ['Face ID'],
  'expo-tracking-transparency': ['tracking'],
  'expo-notifications': ['push notifications (no purpose string, but must not be required to use the app)'],
  'react-native-vision-camera': ['camera', 'microphone'],
  'react-native-permissions': ['whatever is enabled in its setup; read the project configuration'],
};

const DATA_HINTS = {
  'expo-updates': { review: ['Device ID', 'Crash Data'], note: 'With Expo Update: answer Yes, declare Device ID and Crash Data (Play: Device or other IDs, Crash logs). Self-hosted: declare what your server stores. https://docs.expo.dev/eas-update/store-privacy-declarations/' },
  '@sentry/react-native': { review: ['crash reports', 'performance diagnostics'] },
  '@react-native-firebase/crashlytics': { review: ['crash reports'] },
  '@react-native-firebase/analytics': { review: ['usage analytics', 'device or app identifiers'] },
  '@react-native-firebase/messaging': { review: ['push token or device identifier'] },
  '@bugsnag/react-native': { review: ['crash reports'] },
  '@datadog/mobile-react-native': { review: ['crash reports', 'performance diagnostics', 'usage analytics'] },
  '@amplitude/analytics-react-native': { review: ['usage analytics', 'identifiers'] },
  'mixpanel-react-native': { review: ['usage analytics', 'identifiers'] },
  'posthog-react-native': { review: ['usage analytics', 'identifiers'] },
  '@segment/analytics-react-native': { review: ['usage analytics', 'identifiers', 'data forwarded to Segment destinations'] },
  'react-native-google-mobile-ads': { review: ['advertising data', 'identifiers'], note: 'Review tracking: read the SDK docs and the App Privacy details page.' },
  'react-native-fbsdk-next': { review: ['identifiers', 'usage analytics'], note: 'Review tracking: read the SDK docs and the App Privacy details page.' },
  'react-native-purchases': { review: ['purchase history', 'identifiers'] },
  'react-native-onesignal': { review: ['push token or device identifier'] },
  'firebase': { review: ['depends on the Firebase products imported; check each'] },
  '@react-native-firebase/auth': { review: ['account data: email, user ID, name'] },
  '@supabase/supabase-js': { review: ['account data if Supabase Auth is used', 'any table data the app uploads'] },
  'react-native-auth0': { review: ['account data: email, user ID, name'] },
};

const DATA_PREFIX_HINTS = {
  '@clerk/': { review: ['account data: email, user ID, name'] },
};

const AI_PACKAGES = new Set([
  'openai',
  '@anthropic-ai/sdk',
  '@google/generative-ai',
  '@google/genai',
  '@mistralai/mistralai',
  'groq-sdk',
  'ai',
]);
const AI_PREFIXES = ['@ai-sdk/'];
const AI_HOSTS = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'api.groq.com',
  'openrouter.ai',
];

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.swift', '.m', '.mm', '.kt', '.java']);
const SOURCE_SKIP = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'web-build', 'Pods', '.next', 'coverage', 'store']);
const MODULES_SKIP = new Set(['.bin', '.cache', 'android', '__tests__', 'test', 'tests', 'example', 'examples', 'docs']);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
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

function rel(root, path) {
  return relative(root, path).split(sep).join('/');
}

function packageFromPath(path) {
  const parts = path.split(sep);
  const i = parts.lastIndexOf('node_modules');
  if (i === -1 || i + 1 >= parts.length) return null;
  return parts[i + 1].startsWith('@') ? `${parts[i + 1]}/${parts[i + 2]}` : parts[i + 1];
}

function parseAccessedApiTypes(xml) {
  const entries = [];
  for (const dict of xml.match(/<dict>(?:(?!<dict>)[\s\S])*?<\/dict>/g) ?? []) {
    const type = dict.match(/<key>\s*NSPrivacyAccessedAPIType\s*<\/key>\s*<string>([^<]+)<\/string>/);
    if (!type) continue;
    const list = dict.match(/<key>\s*NSPrivacyAccessedAPITypeReasons\s*<\/key>\s*<array>([\s\S]*?)<\/array>/);
    const reasons = list ? [...list[1].matchAll(/<string>([^<]+)<\/string>/g)].map((m) => m[1].trim()) : [];
    entries.push({ category: type[1].trim(), reasons });
  }
  return entries;
}

function matchPrefix(name, table) {
  const prefix = Object.keys(table).find((p) => name.startsWith(p));
  return prefix ? table[prefix] : null;
}

function loadAppConfig(root, configPath) {
  if (configPath) {
    const json = readJson(resolve(configPath));
    if (!json) return { source: configPath, config: null, error: 'Could not parse --config file as JSON.' };
    return { source: configPath, config: json.expo ?? json };
  }
  const appJson = join(root, 'app.json');
  const dynamic = ['app.config.js', 'app.config.ts', 'app.config.mjs', 'app.config.cjs'].find((f) => existsSync(join(root, f)));
  if (dynamic) {
    return {
      source: dynamic,
      config: null,
      error: `${dynamic} cannot be read statically. Run "npx expo config --json > expo-config.json" and pass --config expo-config.json.`,
    };
  }
  if (existsSync(appJson)) {
    const json = readJson(appJson);
    if (!json) return { source: 'app.json', config: null, error: 'Could not parse app.json.' };
    return { source: 'app.json', config: json.expo ?? json };
  }
  return { source: null, config: null };
}

function declaredFromConfig(config) {
  const list = config?.ios?.privacyManifests?.NSPrivacyAccessedAPITypes;
  if (!Array.isArray(list)) return [];
  return list.map((e) => ({
    category: e?.NSPrivacyAccessedAPIType,
    reasons: Array.isArray(e?.NSPrivacyAccessedAPITypeReasons) ? e.NSPrivacyAccessedAPITypeReasons : [],
  }));
}

function declaredFromNativeProject(root) {
  const iosDir = join(root, 'ios');
  const found = [];
  if (!existsSync(iosDir)) return found;
  walk(iosDir, new Set(['Pods', 'build', 'DerivedData']), (path, name) => {
    if (name.endsWith('.xcprivacy')) found.push({ file: rel(root, path), entries: parseAccessedApiTypes(readFileSync(path, 'utf8')) });
  });
  return found;
}

function scanSourcesForAiHosts(root) {
  const hits = [];
  walk(root, SOURCE_SKIP, (path) => {
    if (!SOURCE_EXTENSIONS.has(extname(path))) return;
    let text;
    try {
      if (statSync(path).size > 1_000_000) return;
      text = readFileSync(path, 'utf8');
    } catch {
      return;
    }
    for (const host of AI_HOSTS) if (text.includes(host)) hits.push({ file: rel(root, path), host });
  });
  return hits;
}

function main() {
  const args = process.argv.slice(2);
  let root = process.cwd();
  let configPath = null;
  let modulesPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      console.log(USAGE);
      return 0;
    }
    if (args[i] === '--config') configPath = args[++i];
    else if (args[i] === '--modules') modulesPath = args[++i];
    else root = args[i];
  }
  root = resolve(root);

  const pkg = readJson(join(root, 'package.json'));
  if (!pkg) {
    console.log(JSON.stringify({ error: `No readable package.json in ${root}` }, null, 2));
    return 1;
  }

  const direct = { ...pkg.dependencies, ...pkg.optionalDependencies };
  const dev = pkg.devDependencies ?? {};
  const names = Object.keys(direct);
  const warnings = [];

  const fromPackageManifests = [];
  const modulesDir = modulesPath ? resolve(modulesPath) : join(root, 'node_modules');
  if (existsSync(modulesDir)) {
    const absent = names.filter((n) => !existsSync(join(modulesDir, ...n.split('/'))));
    if (absent.length) {
      warnings.push(`${absent.length} direct dependencies are not in ${modulesDir} (${absent.slice(0, 5).join(', ')}${absent.length > 5 ? ', ...' : ''}). If they are hoisted, pass --modules <workspace node_modules>.`);
    }
    walk(modulesDir, MODULES_SKIP, (path, name) => {
      if (!name.endsWith('.xcprivacy')) return;
      let entries;
      try {
        entries = parseAccessedApiTypes(readFileSync(path, 'utf8'));
      } catch {
        return;
      }
      if (!entries.length) return;
      const owner = packageFromPath(path);
      for (const entry of entries) {
        fromPackageManifests.push({
          package: owner,
          direct: owner in direct,
          file: rel(root, path),
          category: entry.category,
          reasons: entry.reasons,
        });
      }
    });
  } else {
    warnings.push('node_modules not found. Install dependencies first; package privacy manifests cannot be read without them.');
  }

  const heuristic = names
    .filter((n) => REQUIRED_REASON_HINTS[n])
    .filter((n) => !fromPackageManifests.some((m) => m.package === n))
    .map((n) => ({ package: n, ...REQUIRED_REASON_HINTS[n], confirmed: false }));

  const aggregated = {};
  for (const m of fromPackageManifests) {
    aggregated[m.category] ??= { reasons: [], packages: [] };
    for (const r of m.reasons) if (!aggregated[m.category].reasons.includes(r)) aggregated[m.category].reasons.push(r);
    if (!aggregated[m.category].packages.includes(m.package)) aggregated[m.category].packages.push(m.package);
  }

  const isExpo = 'expo' in direct;
  const app = loadAppConfig(root, configPath);
  if (app.error) warnings.push(app.error);
  const nativeManifests = declaredFromNativeProject(root);
  const declaredInAppConfig = app.config ? declaredFromConfig(app.config) : null;

  const comparedAgainst = isExpo && declaredInAppConfig !== null ? 'app config' : nativeManifests.length ? 'native PrivacyInfo.xcprivacy' : null;
  if (isExpo && nativeManifests.length) {
    warnings.push('ios/ contains a PrivacyInfo.xcprivacy. If ios/ is committed, that file is what ships and must match app config; if it is generated, it is overwritten on the next prebuild.');
  }
  const declared = {};
  const declaredSources = comparedAgainst === 'app config' ? declaredInAppConfig : nativeManifests.flatMap((f) => f.entries);
  for (const d of declaredSources) {
    if (!d.category) continue;
    declared[d.category] ??= new Set();
    for (const r of d.reasons) declared[d.category].add(r);
  }

  const missing = [];
  const canCompare = comparedAgainst !== null;
  if (canCompare) {
    for (const [category, { reasons, packages }] of Object.entries(aggregated)) {
      const have = declared[category] ?? new Set();
      const lacking = reasons.filter((r) => !have.has(r));
      if (!declared[category] || lacking.length) missing.push({ category, reasons: lacking, packages });
    }
    for (const h of heuristic) {
      if (!declared[h.category] && !missing.some((m) => m.category === h.category)) {
        missing.push({ category: h.category, reasons: [], packages: [h.package], heuristic: true });
      }
    }
  }

  const invalid = [];
  const checkCodes = (where, category, reasons) => {
    const known = KNOWN_REASONS[category];
    if (!known) invalid.push({ where, category, problem: 'category not in store-ready source list' });
    else for (const r of reasons) if (!known.includes(r)) invalid.push({ where, category, reason: r, problem: 'reason code not in store-ready source list for this category' });
  };
  for (const d of declaredInAppConfig ?? []) checkCodes(app.source, d.category, d.reasons);
  for (const f of nativeManifests) for (const e of f.entries) checkCodes(f.file, e.category, e.reasons);
  for (const m of fromPackageManifests) checkCodes(m.file, m.category, m.reasons);

  const permissions = names.filter((n) => PERMISSION_HINTS[n]).map((n) => ({ package: n, features: PERMISSION_HINTS[n] }));

  const dataCollection = names
    .map((n) => {
      const hint = DATA_HINTS[n] ?? matchPrefix(n, DATA_PREFIX_HINTS);
      return hint ? { package: n, ...hint } : null;
    })
    .filter(Boolean);

  const aiPackages = [...names, ...Object.keys(dev)]
    .filter((n) => AI_PACKAGES.has(n) || AI_PREFIXES.some((p) => n.startsWith(p)))
    .map((n) => ({ package: n, dev: !(n in direct) }));
  const aiHosts = scanSourcesForAiHosts(root);

  const report = {
    tool: 'store-ready ios-privacy scan-deps',
    heuristic: true,
    note: 'fromPackageManifests is read from files. Everything under heuristic, permissions, dataCollection and ai is a starting list: confirm each item in code or vendor docs before it goes into config or App Store Connect.',
    projectRoot: root,
    expo: isExpo,
    appConfig: app.source,
    dependencyCount: names.length,
    requiredReasonApis: {
      fromPackageManifests,
      aggregated,
      heuristic,
      declaredInAppConfig,
      nativeManifests: nativeManifests.map((f) => ({ file: f.file, entries: f.entries })),
      comparedAgainst,
      missingDeclarations: canCompare ? missing : null,
      invalidReasonCodes: invalid,
    },
    permissions,
    dataCollection,
    ai: { packages: aiPackages, hostsInSource: aiHosts },
    warnings,
  };
  console.log(JSON.stringify(report, null, 2));
  return 0;
}

process.exitCode = main();
