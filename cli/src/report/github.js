import path from 'node:path';

const COMMANDS = { error: 'error', warning: 'warning', info: 'notice' };

/** @param {string} text */
export function escapeData(text) {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/** @param {string} text */
export function escapeProperty(text) {
  return escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');
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
