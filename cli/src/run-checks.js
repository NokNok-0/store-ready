import { CHECKS } from './checks/index.js';
import { normalizeIssue, sortIssues, summarize } from './issue.js';
import { findLinks } from './project/links.js';
import { loadProject } from './project/load-project.js';
import { SOURCES } from './sources.js';
import { verifyUrls } from './verify-urls.js';

/**
 * @typedef {{ platform?: 'ios' | 'android' | 'both', configFile?: string, cwd?: string }} CheckOptions
 * @typedef {{
 *   version: number,
 *   project: { type: string, path: string },
 *   issues: import('./issue.js').Issue[],
 *   summary: { errors: number, warnings: number, infos: number },
 *   notChecked?: string[],
 * }} CheckResult
 */

/**
 * Offline check: reads files only.
 * @param {string} target
 * @param {CheckOptions} [options]
 * @returns {CheckResult}
 */
export function check(target, { platform = 'both', configFile, cwd = process.cwd() } = {}) {
  const project = loadProject(target, { configFile, cwd });
  return runChecks(project, platform);
}

/**
 * Like check(), and with verifyUrls also fetches every URL the checks report (HEAD, fallback GET).
 * @param {string} target
 * @param {CheckOptions & { verifyUrls?: boolean, fetchImpl?: typeof fetch, timeoutMs?: number, allowPrivateHosts?: boolean }} [options]
 * @returns {Promise<CheckResult>}
 */
export async function checkAsync(target, { platform = 'both', configFile, cwd = process.cwd(), verifyUrls: verify = false, fetchImpl, timeoutMs, allowPrivateHosts } = {}) {
  const project = loadProject(target, { configFile, cwd });
  if (verify) {
    const results = await verifyUrls(findLinks(project).map((link) => link.url), { fetchImpl, timeoutMs, allowPrivateHosts });
    for (const [url, result] of results) project.urlChecks.set(url, result);
  }
  return runChecks(project, platform);
}

/**
 * @param {import('./project/load-project.js').Project} project
 * @param {'ios' | 'android' | 'both'} platform
 * @returns {CheckResult}
 */
function runChecks(project, platform) {
  /** @type {{ issue: import('./issue.js').Issue, missing?: string[] }[]} */
  const entries = project.notes.map((note) => ({ issue: normalizeIssue(note.id, note) }));
  for (const item of CHECKS) {
    let raw;
    try {
      raw = item.run(project);
    } catch (error) {
      raw = [{
        severity: /** @type {const} */ ('warning'),
        platform: /** @type {const} */ ('both'),
        message: `This check stopped early (${error instanceof Error ? error.name : 'error'}) on a file it could not handle, so its results are incomplete.`,
        fix: 'Check the project files this rule reads for unusual content, and report the problem to store-ready.',
        source: item.source,
      }];
    }
    for (const entry of raw) {
      const missing = /** @type {{ missing?: unknown }} */ (entry).missing;
      entries.push({ issue: normalizeIssue(item.id, entry), missing: Array.isArray(missing) ? missing.map(String) : undefined });
    }
  }
  for (const file of project.files.outside) {
    entries.push({
      issue: normalizeIssue('project.paths', {
        severity: 'warning',
        platform: 'both',
        message: `${file} points outside the project, not read.`,
        fix: 'Use a path inside the project (no absolute paths, ".." or symlinks that leave the project).',
        source: SOURCES.expoVersions,
        file,
      }),
    });
  }
  const shown = entries.filter(({ issue }) => platform === 'both' || issue.platform === 'both' || issue.platform === platform);
  const visible = sortIssues(shown.map(({ issue }) => issue));
  /** @type {CheckResult} */
  const result = {
    version: 1,
    project: { type: project.type, path: project.root },
    issues: visible,
    summary: summarize(visible),
  };
  // Store files that do not exist yet, for the human footer. Not enumerable, so --json keeps its shape.
  const notChecked = [...new Set(shown.flatMap(({ missing }) => missing ?? []))];
  Object.defineProperty(result, 'notChecked', { value: notChecked, enumerable: false });
  return result;
}
