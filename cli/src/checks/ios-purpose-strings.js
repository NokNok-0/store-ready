import { isObject } from '../fs-utils.js';
import { SOURCES } from '../sources.js';
import { configFileName, pluginOptions, truncate } from './expo-helpers.js';

export const id = 'ios.purpose-strings';
export const title = 'iOS permission purpose strings';
export const source = SOURCES.applePurposeStrings;

/**
 * Expo packages whose config plugin writes a purpose string. `option` is the plugin option that sets it;
 * setting the option to false removes the permission. `when: 'recording'` applies only if recording code is found.
 * @type {{ pkg: string, key: string, option: string, alternatives?: string[], when?: 'recording' }[]}
 */
export const PACKAGE_PURPOSE_STRINGS = [
  { pkg: 'expo-camera', key: 'NSCameraUsageDescription', option: 'cameraPermission' },
  { pkg: 'expo-image-picker', key: 'NSPhotoLibraryUsageDescription', option: 'photosPermission' },
  { pkg: 'expo-image-picker', key: 'NSCameraUsageDescription', option: 'cameraPermission' },
  { pkg: 'expo-location', key: 'NSLocationWhenInUseUsageDescription', option: 'locationWhenInUsePermission' },
  { pkg: 'expo-contacts', key: 'NSContactsUsageDescription', option: 'contactsPermission' },
  { pkg: 'expo-calendar', key: 'NSCalendarsUsageDescription', option: 'calendarPermission', alternatives: ['NSCalendarsFullAccessUsageDescription'] },
  { pkg: 'expo-media-library', key: 'NSPhotoLibraryUsageDescription', option: 'photosPermission' },
  { pkg: 'expo-tracking-transparency', key: 'NSUserTrackingUsageDescription', option: 'userTrackingPermission' },
  { pkg: 'expo-av', key: 'NSMicrophoneUsageDescription', option: 'microphonePermission', when: 'recording' },
  { pkg: 'expo-audio', key: 'NSMicrophoneUsageDescription', option: 'microphonePermission', when: 'recording' },
];

export const RECORDING_INDICATORS = [
  /\bAudio\.Recording\b/,
  /\buseAudioRecorder\s*\(/,
  /\bRecordingPresets\b/,
  /\brequestRecordingPermissionsAsync\s*\(/,
];

export const MIN_LENGTH = 25;

/** Text that reads like a template rather than a reason. Each entry is tested against the whole purpose string. */
export const GENERIC_PATTERNS = [
  /\bfor (?:the )?app(?:'s)? functionality\b/i,
  /\bfor (?:proper |full |core )?functionality\b/i,
  /\bto (?:function|work|run) (?:properly|correctly)\b/i,
  /\bfor (?:a )?better (?:user )?experience\b/i,
  /^(?:allow|let)\s+\S+(?:\s+\S+)?\s+(?:to\s+)?(?:access|use)\s+(?:your|the)(?:\s+[a-z]+){1,3}\s*\.?$/i,
  /^(?:this|the|our)\s+app\s+(?:needs|requires|wants|would like|uses)\s+(?:to\s+)?(?:access|use|permission)(?:\s+(?:to|for))?(?:\s+(?:your|the))?(?:\s+[a-z]+){0,3}\s*\.?$/i,
  /^(?:we|app)\s+needs?\s+(?:your\s+)?(?:permission|access)\b(?:\s+[a-z]+){0,3}\s*\.?$/i,
];

/** A specific purpose string says what the data is for; one of these words is expected. */
export const REASON_WORDS = /\b(?:to|so|for|when|while|lets?|used?|uses|because|helps?|allows?|enables?)\b/i;

const EXAMPLES = /** @type {Record<string, string>} */ ({
  NSCameraUsageDescription: 'The camera is used to scan receipts and attach them to an expense.',
  NSPhotoLibraryUsageDescription: 'Your photo library is used when you choose a picture to attach to a note.',
  NSLocationWhenInUseUsageDescription: 'Your location is used to show coffee shops near you on the map.',
  NSContactsUsageDescription: 'Your contacts are used to find friends who already use the app.',
  NSCalendarsUsageDescription: 'Your calendar is used to add the classes you book as events.',
  NSMicrophoneUsageDescription: 'The microphone is used to record voice notes that you attach to a task.',
  NSUserTrackingUsageDescription: 'Your activity in other apps is used to show ads that match your interests.',
});
const DEFAULT_EXAMPLE = 'The camera is used to scan receipts and attach them to an expense.';

/**
 * @param {string} text
 * @returns {string | null} why the text is generic, or null when it looks specific
 */
export function genericReason(text) {
  const value = text.trim();
  if ([...value].length < MIN_LENGTH) return `is shorter than ${MIN_LENGTH} characters`;
  if (GENERIC_PATTERNS.some((pattern) => pattern.test(value))) return 'reads like template text';
  if (!REASON_WORDS.test(value)) return 'does not say what the data is used for';
  return null;
}

/**
 * @typedef {{ value: unknown, file: string, origin: string }} Entry
 * @param {import('../project/load-project.js').Project} project
 */
function collectStrings(project) {
  /** @type {Map<string, Entry[]>} */
  const strings = new Map();
  /** @type {Set<string>} */
  const disabled = new Set();
  /** @param {string} key @param {Entry} entry */
  const add = (key, entry) => {
    const list = strings.get(key) ?? [];
    list.push(entry);
    strings.set(key, list);
  };
  const config = project.expo.config;
  const file = configFileName(project);
  if (project.expo.isExpo) {
    const infoPlist = config.ios?.infoPlist;
    if (isObject(infoPlist)) {
      for (const [key, value] of Object.entries(infoPlist)) {
        if (key.endsWith('UsageDescription')) add(key, { value, file, origin: 'expo.ios.infoPlist' });
      }
    }
    for (const mapping of PACKAGE_PURPOSE_STRINGS) {
      for (const options of pluginOptions(config, mapping.pkg)) {
        const value = options[mapping.option];
        if (value === false) disabled.add(`${mapping.pkg}:${mapping.key}`);
        else if (value !== undefined) add(mapping.key, { value, file, origin: `${mapping.pkg} plugin option "${mapping.option}"` });
      }
    }
  }
  for (const plist of project.ios.infoPlists) {
    if (!isObject(plist.data)) continue;
    for (const [key, value] of Object.entries(plist.data)) {
      if (key.endsWith('UsageDescription')) add(key, { value, file: plist.file, origin: plist.file });
    }
  }
  return { strings, disabled };
}

/** @param {import('../project/load-project.js').Project} project @param {Set<string>} disabled */
function requiredKeys(project, disabled) {
  /** @type {Map<string, { key: string, alternatives: string[], packages: string[], option: string, pkg: string }>} */
  const required = new Map();
  /** @type {boolean | undefined} */
  let recording;
  for (const mapping of PACKAGE_PURPOSE_STRINGS) {
    if (!project.hasDependency(mapping.pkg) || disabled.has(`${mapping.pkg}:${mapping.key}`)) continue;
    if (mapping.when === 'recording') {
      recording ??= RECORDING_INDICATORS.some((pattern) => project.code.search(pattern) !== null);
      if (!recording) continue;
    }
    const existing = required.get(mapping.key);
    if (existing) existing.packages.push(mapping.pkg);
    else {
      required.set(mapping.key, {
        key: mapping.key,
        alternatives: mapping.alternatives ?? [],
        packages: [mapping.pkg],
        option: mapping.option,
        pkg: mapping.pkg,
      });
    }
  }
  return required;
}

/** @param {import('../project/load-project.js').Project} project */
export function run(project) {
  if (!project.platforms.has('ios')) return [];
  /** @type {Omit<import('../issue.js').Issue, 'id'>[]} */
  const issues = [];
  const { strings, disabled } = collectStrings(project);
  const file = configFileName(project);

  for (const plist of project.ios.infoPlists) {
    if (!plist.error) continue;
    issues.push({
      severity: 'warning',
      platform: 'ios',
      message: `${plist.file} is ${plist.error}, so purpose strings in it were not checked.`,
      fix: 'Make sure the file is a valid XML property list.',
      source: SOURCES.applePurposeStrings,
      file: plist.file,
    });
  }

  for (const requirement of requiredKeys(project, disabled).values()) {
    const keys = [requirement.key, ...requirement.alternatives];
    const satisfied = keys.some((key) => (strings.get(key) ?? []).some((entry) => typeof entry.value === 'string' && entry.value.trim() !== ''));
    if (satisfied || (project.expo.isExpo && !project.expo.complete)) continue;
    const packages = requirement.packages.join(', ');
    const example = EXAMPLES[requirement.key] ?? DEFAULT_EXAMPLE;
    const fix = project.expo.isExpo
      ? `Add "${requirement.key}" to expo.ios.infoPlist in ${file}, or set the "${requirement.option}" option of the ${requirement.pkg} config plugin. Say what the app does with the data and give an example, such as "${example}"`
      : `Add ${requirement.key} to the app's Info.plist. Say what the app does with the data and give an example, such as "${example}"`;
    issues.push({
      severity: 'error',
      platform: 'ios',
      message: `${requirement.key} is not set, but ${packages} ${requirement.packages.length > 1 ? 'use' : 'uses'} that permission. Without your own text the app ships no purpose string or the package's generic default.`,
      fix,
      source: SOURCES.applePurposeStrings,
      file: project.expo.isExpo ? file : project.ios.infoPlists[0]?.file ?? file,
    });
  }

  const seen = new Set();
  for (const [key, entries] of strings) {
    for (const entry of entries) {
      const signature = `${key}\u0000${String(entry.value)}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      if (typeof entry.value !== 'string') {
        issues.push({
          severity: 'error',
          platform: 'ios',
          message: `${key} in ${entry.origin} is not a string.`,
          fix: `Set ${key} to a sentence that says what the app does with the data.`,
          source: SOURCES.applePurposeStrings,
          file: entry.file,
        });
        continue;
      }
      const reason = genericReason(entry.value);
      if (!reason) continue;
      issues.push({
        severity: 'warning',
        platform: 'ios',
        message: `${key} "${truncate(entry.value.trim(), 70)}" (${entry.origin}) ${reason}. Vague purpose strings are a common rejection under guideline 5.1.1(ii).`,
        fix: `Rewrite it to say what the app does with the data and give an example, such as "${EXAMPLES[key] ?? DEFAULT_EXAMPLE}"`,
        source: SOURCES.applePurposeStrings,
        file: entry.file,
      });
    }
  }
  return issues;
}
