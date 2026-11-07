/**
 * @typedef {'error' | 'warning' | 'info'} Severity
 * @typedef {'ios' | 'android' | 'both'} Platform
 * @typedef {{ id: string, severity: Severity, platform: Platform, message: string, fix: string, source: string, file?: string }} Issue
 */

export const SEVERITIES = /** @type {const} */ (['error', 'warning', 'info']);
export const PLATFORMS = /** @type {const} */ (['ios', 'android', 'both']);

/**
 * @param {string} checkId
 * @param {Omit<Issue, 'id'> & { id?: string }} raw
 * @returns {Issue}
 */
export function normalizeIssue(checkId, raw) {
  if (!SEVERITIES.includes(raw.severity)) throw new Error(`${checkId}: invalid severity "${raw.severity}"`);
  if (!PLATFORMS.includes(raw.platform)) throw new Error(`${checkId}: invalid platform "${raw.platform}"`);
  for (const field of ['message', 'fix', 'source']) {
    if (typeof raw[field] !== 'string' || raw[field] === '') throw new Error(`${checkId}: missing ${field}`);
  }
  /** @type {Issue} */
  const issue = {
    id: raw.id ?? checkId,
    severity: raw.severity,
    platform: raw.platform,
    message: raw.message,
    fix: raw.fix,
    source: raw.source,
  };
  if (raw.file) issue.file = raw.file.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
  return issue;
}

/** @param {Issue[]} issues */
export function sortIssues(issues) {
  return issues
    .map((issue, index) => ({ issue, index }))
    .sort((a, b) =>
      PLATFORMS.indexOf(a.issue.platform) - PLATFORMS.indexOf(b.issue.platform) ||
      SEVERITIES.indexOf(a.issue.severity) - SEVERITIES.indexOf(b.issue.severity) ||
      a.index - b.index)
    .map(({ issue }) => issue);
}

/** @param {Issue[]} issues */
export function summarize(issues) {
  const summary = { errors: 0, warnings: 0, infos: 0 };
  for (const issue of issues) {
    if (issue.severity === 'error') summary.errors += 1;
    else if (issue.severity === 'warning') summary.warnings += 1;
    else summary.infos += 1;
  }
  return summary;
}
