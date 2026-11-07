import { CHECKS } from './checks/index.js';
import { normalizeIssue, sortIssues, summarize } from './issue.js';
import { loadProject } from './project/load-project.js';
import { SOURCES } from './sources.js';

/**
 * @param {string} target
 * @param {{ platform?: 'ios' | 'android' | 'both', configFile?: string, cwd?: string }} [options]
 */
export function check(target, { platform = 'both', configFile, cwd = process.cwd() } = {}) {
  const project = loadProject(target, { configFile, cwd });
  /** @type {import('./issue.js').Issue[]} */
  const issues = project.notes.map((note) => normalizeIssue(note.id, note));
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
    for (const entry of raw) issues.push(normalizeIssue(item.id, entry));
  }
  for (const file of project.files.outside) {
    issues.push(normalizeIssue('project.paths', {
      severity: 'warning',
      platform: 'both',
      message: `${file} points outside the project, not read.`,
      fix: 'Use a path inside the project (no absolute paths, ".." or symlinks that leave the project).',
      source: SOURCES.expoVersions,
      file,
    }));
  }
  const visible = sortIssues(issues.filter((issue) => platform === 'both' || issue.platform === 'both' || issue.platform === platform));
  return {
    version: 1,
    project: { type: project.type, path: project.root },
    issues: visible,
    summary: summarize(visible),
  };
}
