import { relative, sep } from 'node:path';

const GROUPS = /** @type {const} */ ([['ios', 'iOS'], ['android', 'Android'], ['both', 'Both platforms']]);
const BADGES = { error: 'ERROR', warning: 'WARN ', info: 'INFO ' };
const COLORS = { error: '31', warning: '33', info: '36' };
const INDENT = ' '.repeat(9);

/**
 * @param {ReturnType<typeof import('../run-checks.js').check>} result
 * @param {{ color: boolean, strict: boolean, version: string }} options
 */
export function formatHuman(result, { color, strict, version }) {
  /** @param {string} code @param {string} text */
  const paint = (code, text) => (color ? `\u001b[${code}m${text}\u001b[0m` : text);
  const shown = relative(process.cwd(), result.project.path).split(sep).join('/') || '.';
  const lines = [`store-ready ${version}: checked ${result.project.type} project at ${shown}`, ''];

  for (const [platform, label] of GROUPS) {
    const issues = result.issues.filter((issue) => issue.platform === platform);
    if (issues.length === 0) continue;
    lines.push(paint('1', label));
    for (const issue of issues) {
      lines.push(`  ${paint(COLORS[issue.severity], BADGES[issue.severity])}  ${paint('1', issue.id)}${issue.file ? `  ${issue.file}` : ''}`);
      lines.push(`${INDENT}${issue.message}`);
      lines.push(`${INDENT}Fix:    ${issue.fix}`);
      lines.push(`${INDENT}Source: ${issue.source}`);
      lines.push('');
    }
  }
  if (result.issues.length === 0) lines.push('No issues found.', '');

  const { errors, warnings, infos } = result.summary;
  lines.push(`${count(errors, 'error')}, ${count(warnings, 'warning')}, ${infos} info`);
  if (errors > 0) lines.push('Fix the errors above, then run the check again.');
  else if (strict && warnings > 0) lines.push('Warnings fail with --strict. Fix them, then run the check again.');
  else lines.push('Passes the checks we know about. Store review also covers things no tool can check, such as crashes and server behaviour.');
  return `${lines.join('\n')}\n`;
}

/** @param {number} n @param {string} word */
function count(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
