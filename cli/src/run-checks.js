import { CHECKS } from './checks/index.js';
import { normalizeIssue, sortIssues, summarize } from './issue.js';
import { loadProject } from './project/load-project.js';

/**
 * @param {string} target
 * @param {{ platform?: 'ios' | 'android' | 'both', configFile?: string, cwd?: string }} [options]
 */
export function check(target, { platform = 'both', configFile, cwd = process.cwd() } = {}) {
  const project = loadProject(target, { configFile, cwd });
  /** @type {import('./issue.js').Issue[]} */
  const issues = project.notes.map((note) => normalizeIssue(note.id, note));
  for (const item of CHECKS) {
    for (const raw of item.run(project)) issues.push(normalizeIssue(item.id, raw));
  }
  const visible = sortIssues(issues.filter((issue) => platform === 'both' || issue.platform === 'both' || issue.platform === platform));
  return {
    version: 1,
    project: { type: project.type, path: project.root },
    issues: visible,
    summary: summarize(visible),
  };
}
