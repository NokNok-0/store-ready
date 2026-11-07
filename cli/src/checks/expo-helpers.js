import { isObject } from '../fs-utils.js';

/**
 * @param {Record<string, any>} config
 * @returns {{ name: string, options: Record<string, any> }[]}
 */
export function pluginEntries(config) {
  if (!Array.isArray(config.plugins)) return [];
  const entries = [];
  for (const plugin of config.plugins) {
    if (typeof plugin === 'string') entries.push({ name: plugin, options: {} });
    else if (Array.isArray(plugin) && typeof plugin[0] === 'string') {
      entries.push({ name: plugin[0], options: isObject(plugin[1]) ? plugin[1] : {} });
    }
  }
  return entries;
}

/** @param {Record<string, any>} config @param {string} name */
export function pluginOptions(config, name) {
  return pluginEntries(config).filter((entry) => entry.name === name).map((entry) => entry.options);
}

/** @param {import('../project/load-project.js').Project} project */
export function configFileName(project) {
  return project.expo.file ?? 'app.json';
}

/** @param {unknown} value */
export function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** @param {string} text @param {number} max */
export function truncate(text, max) {
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max - 3).join('')}...` : text;
}
