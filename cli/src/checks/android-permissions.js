import { SOURCES } from '../sources.js';
import { configFileName, pluginOptions } from './expo-helpers.js';

export const id = 'android.permissions';
export const title = 'Android permissions that need Play declarations';
export const source = SOURCES.playPolicy;

const PREFIX = 'android.permission.';

/** Permissions that need a Play Console declaration or are restricted, with what Play asks for. */
export const DECLARATION_RULES = [
  {
    pattern: /^android\.permission\.READ_MEDIA_(?:IMAGES|VIDEO)$/,
    detail: 'Play allows it only when the system photo picker cannot support the core feature, and requires a Photo and video permissions declaration.',
    source: SOURCES.playPhotoVideo,
  },
  {
    pattern: /^android\.permission\.ACCESS_BACKGROUND_LOCATION$/,
    detail: 'Play requires a background location declaration for one core feature, a demo video of 30 seconds or less showing the prominent in-app disclosure and the runtime prompt, a privacy policy that covers location, and test credentials if login is needed.',
    source: SOURCES.playBackgroundLocation,
  },
  {
    pattern: /^android\.permission\.USE_EXACT_ALARM$/,
    detail: 'Play allows it only for alarm, timer or calendar apps, with a declaration; other apps should use the user-granted SCHEDULE_EXACT_ALARM.',
    source: SOURCES.playExactAlarm,
  },
  {
    pattern: /^android\.permission\.FOREGROUND_SERVICE_[A-Z_]+$/,
    detail: 'For apps targeting Android 14+, Play requires each foreground service type to be declared with its permission and, in App content, a description, the user impact if interrupted, a demo video and the use case.',
    source: SOURCES.playForegroundService,
  },
  {
    pattern: /^android\.permission\.USE_FULL_SCREEN_INTENT$/,
    detail: 'On Android 14+ it is auto-granted only to alarm and calling apps.',
    source: SOURCES.playPolicy,
  },
  {
    pattern: /^android\.permission\.MANAGE_EXTERNAL_STORAGE$/,
    detail: 'Play requires a declaration for it.',
    source: SOURCES.playPolicy,
  },
  {
    pattern: /^android\.permission\.QUERY_ALL_PACKAGES$/,
    detail: 'Play requires a declaration for it.',
    source: SOURCES.playPolicy,
  },
];

/** @param {string} name */
export function normalizePermission(name) {
  const trimmed = name.trim();
  return trimmed.includes('.') ? trimmed : `${PREFIX}${trimmed}`;
}

/** @param {string} name */
function shortName(name) {
  return name.startsWith(PREFIX) ? name.slice(PREFIX.length) : name;
}

/**
 * @param {import('../project/load-project.js').Project} project
 * @returns {{ declared: Map<string, { file: string, origin: string }>, blocked: Set<string> }}
 */
export function collectPermissions(project) {
  /** @type {Map<string, { file: string, origin: string }>} */
  const declared = new Map();
  /** @type {Set<string>} */
  const blocked = new Set();
  const config = project.expo.config;
  if (project.expo.isExpo) {
    const file = configFileName(project);
    for (const name of Array.isArray(config.android?.permissions) ? config.android.permissions : []) {
      if (typeof name === 'string') declared.set(normalizePermission(name), { file, origin: 'expo.android.permissions' });
    }
    for (const name of Array.isArray(config.android?.blockedPermissions) ? config.android.blockedPermissions : []) {
      if (typeof name === 'string') blocked.add(normalizePermission(name));
    }
    for (const options of pluginOptions(config, 'expo-location')) {
      if (options.isAndroidBackgroundLocationEnabled === true) {
        declared.set(`${PREFIX}ACCESS_BACKGROUND_LOCATION`, { file, origin: 'expo-location plugin option "isAndroidBackgroundLocationEnabled"' });
      }
    }
  }
  const manifest = project.android.manifest;
  if (manifest) {
    for (const permission of manifest.permissions) {
      const name = normalizePermission(permission.name);
      if (permission.removed) blocked.add(name);
      else if (!declared.has(name)) declared.set(name, { file: manifest.file, origin: manifest.file });
    }
  }
  for (const name of blocked) declared.delete(name);
  return { declared, blocked };
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  if (!project.platforms.has('android')) return [];
  const { declared } = collectPermissions(project);
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  if (declared.size === 0) return issues;

  const first = declared.values().next().value;
  issues.push({
    severity: 'info',
    platform: 'android',
    message: `Declared Android permissions: ${[...declared.keys()].map(shortName).join(', ')}. Libraries can add more when the manifest is merged at build time.`,
    fix: 'Keep only the permissions the app uses, and make sure the Data safety form covers the data they give access to.',
    source: SOURCES.playDataSafety,
    file: first?.file,
  });

  for (const [name, { file, origin }] of declared) {
    const rule = DECLARATION_RULES.find((candidate) => candidate.pattern.test(name));
    if (!rule) continue;
    const remove = project.expo.isExpo
      ? `remove it from expo.android.permissions, or add "${name}" to expo.android.blockedPermissions if a library adds it`
      : `remove it from AndroidManifest.xml, or add <uses-permission android:name="${name}" tools:node="remove" /> if a library adds it`;
    issues.push({
      severity: 'warning',
      platform: 'android',
      message: `${shortName(name)} is declared (${origin}). ${rule.detail}`,
      fix: `If the app needs it, complete the declaration in Play Console under App content. If not, ${remove}.`,
      source: rule.source,
      file,
    });
  }
  return issues;
}
