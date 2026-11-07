import path from 'node:path';
import { stripControl } from './sanitize.js';

const COMMANDS = { error: 'error', warning: 'warning', info: 'notice' };

/** @param {unknown} value */
export function escapeData(value) {
  return stripControl(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/** @param {unknown} value */
export function escapeProperty(value) {
  return escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

/**
 * @param {ReturnType<typeof import('../run-checks.js').check>} result
 * @param {{ cwd: string }} options
 */
export function formatGithub(result, { cwd }) {
  const lines = result.issues.map((issue) => {
    const properties = [];
    if (issue.file) {
      const absolute = path.resolve(result.project.path, issue.file);
      properties.push(`file=${escapeProperty(path.relative(cwd, absolute).split(path.sep).join('/'))}`);
    }
    properties.push(`title=${escapeProperty(`${issue.id} (${issue.platform})`)}`);
    return `::${COMMANDS[issue.severity]} ${properties.join(',')}::${escapeData(`${issue.message} Fix: ${issue.fix} Source: ${issue.source}`)}`;
  });
  const { errors, warnings, infos } = result.summary;
  lines.push(`store-ready: ${errors} errors, ${warnings} warnings, ${infos} info`);
  return `${lines.join('\n')}\n`;
}
