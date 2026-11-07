#!/usr/bin/env node
// Builds the README images from the sample app's real checker reports:
//   docs/images/check.svg         animated terminal run of examples/habit-tracker/docs/check-before.txt
//   docs/images/before-after.svg  summary of check-before.txt and check-after.txt
// Run from the repository root: node scripts/readme-images.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const BEFORE = 'examples/habit-tracker/docs/check-before.txt';
const AFTER = 'examples/habit-tracker/docs/check-after.txt';
const OUT = 'docs/images';

const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const COLORS = { bg: '#0d1117', bar: '#161b22', text: '#c9d1d9', dim: '#8b949e', error: '#ff7b72', warn: '#e3b341', ok: '#3fb950', prompt: '#79c0ff' };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Severity, check id and first sentence of each error and warning, grouped by platform. */
function parseReport(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(iOS|Android|Both stores)$/.test(line)) rows.push({ kind: 'section', text: line });
    const m = line.match(/^ {2}(ERROR|WARN)\s+(\S+)/);
    if (m) {
      const message = (lines[i + 1] ?? '').trim().replace(/\. .*$/, '.');
      rows.push({ kind: m[1] === 'ERROR' ? 'error' : 'warn', label: m[1], id: m[2], text: message });
    }
  }
  const summary = lines.find((l) => /^\d+ errors?, \d+ warnings?/.test(l)) ?? '';
  return { rows, summary };
}

function terminalSvg({ rows, summary }) {
  const width = 960;
  const lineH = 19;
  const top = 64;
  const maxChars = 104;
  const body = [];
  const cycle = 16; // seconds for one loop
  const start = 1.6; // after the command is typed
  const step = 0.28;
  const shown = [...rows.flatMap((r) => (r.kind === 'section' ? [{ kind: 'blank' }, r] : [r])), { kind: 'blank' }, { kind: 'summary', text: summary }];
  const keyframes = [];
  shown.forEach((row, index) => {
    const y = top + (index + 1) * lineH;
    const at = start + index * step;
    const pct = ((at / cycle) * 100).toFixed(2);
    const name = `l${index}`;
    keyframes.push(`@keyframes ${name}{0%,${pct}%{opacity:0}${(Number(pct) + 0.01).toFixed(2)}%,94%{opacity:1}100%{opacity:0}}`);
    const style = `style="animation:${name} ${cycle}s infinite"`;
    if (row.kind === 'blank') return;
    if (row.kind === 'section') {
      body.push(`<text x="24" y="${y}" fill="${COLORS.text}" font-weight="bold" ${style}>${esc(row.text)}</text>`);
    } else if (row.kind === 'summary') {
      const [errors, warnings, rest] = row.text.split(', ');
      body.push(`<text x="24" y="${y}" font-weight="bold" ${style}><tspan fill="${COLORS.error}">${esc(errors)}</tspan><tspan fill="${COLORS.text}">, </tspan><tspan fill="${COLORS.warn}">${esc(warnings)}</tspan><tspan fill="${COLORS.dim}">, ${esc(rest ?? '')}</tspan></text>`);
    } else {
      const label = row.label.padEnd(6);
      const id = row.id.padEnd(23);
      let message = row.text;
      const room = maxChars - 2 - label.length - 1 - id.length - 1;
      if (message.length > room) message = `${message.slice(0, room - 1).trimEnd()}…`;
      body.push(`<text x="24" y="${y}" xml:space="preserve" ${style}><tspan fill="${COLORS[row.kind]}" font-weight="bold">  ${esc(label)}</tspan><tspan fill="${COLORS.prompt}"> ${esc(id)}</tspan><tspan fill="${COLORS.text}"> ${esc(message)}</tspan></text>`);
    }
  });
  const height = top + (shown.length + 2) * lineH;
  const command = 'npx store-ready check examples/habit-tracker';
  const typeSteps = command.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="store-ready check run on the sample app: ${esc(summary)}">
<title>npx store-ready check on the sample app: ${esc(summary)}</title>
<style>
text{font-family:${FONT};font-size:13px}
.cmd{clip-path:inset(0 100% 0 0);animation:type ${cycle}s steps(${typeSteps}) infinite}
@keyframes type{0%{clip-path:inset(0 100% 0 0)}${((1.4 / cycle) * 100).toFixed(2)}%,94%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(0 100% 0 0)}}
${keyframes.join('\n')}
@media (prefers-reduced-motion: reduce){*{animation:none!important;opacity:1!important;clip-path:none!important}}
</style>
<rect width="${width}" height="${height}" rx="10" fill="${COLORS.bg}"/>
<rect width="${width}" height="34" rx="10" fill="${COLORS.bar}"/>
<rect y="24" width="${width}" height="10" fill="${COLORS.bar}"/>
<circle cx="22" cy="17" r="6" fill="#ff5f57"/><circle cx="42" cy="17" r="6" fill="#febc2e"/><circle cx="62" cy="17" r="6" fill="#28c840"/>
<text x="${width / 2}" y="21" fill="${COLORS.dim}" text-anchor="middle">examples/habit-tracker: before the skills ran</text>
<text x="24" y="${top}" xml:space="preserve"><tspan fill="${COLORS.ok}">$ </tspan><tspan class="cmd" fill="${COLORS.text}">${esc(command)}</tspan></text>
${body.join('\n')}
</svg>
`;
}

function beforeAfterSvg(before, after) {
  const count = (summary, word) => Number(summary.match(new RegExp(`(\\d+) ${word}`))?.[1] ?? 0);
  const b = { errors: count(before.summary, 'error'), warnings: count(before.summary, 'warning') };
  const a = { errors: count(after.summary, 'error'), warnings: count(after.summary, 'warning') };
  const changes = [
    'Account deletion in Settings, with tests',
    'Sign in with Apple next to email sign-up',
    'Specific camera and photo purpose strings',
    'Privacy manifest reasons its packages use',
    '4 unneeded Android permissions blocked',
    'Original icon instead of the Expo template',
    'Fake Google button and dead paywall removed',
  ];
  const files = ['listing.ios.json', 'listing.android.json', 'review-notes.txt', 'privacy.ios.md', 'data-safety.android.md', 'age-rating.md', 'checklist.md', 'screenshots/'];
  const width = 960;
  const height = 330;
  const col = (x, title, value, color, sub) => `
<text x="${x}" y="70" fill="${COLORS.dim}" font-size="14">${esc(title)}</text>
<text x="${x}" y="122" fill="${color}" font-size="36" font-weight="bold">${esc(value)}</text>
<text x="${x}" y="150" fill="${COLORS.dim}" font-size="13">${esc(sub)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Sample app before: ${b.errors} errors and ${b.warnings} warnings. After the skills ran: ${a.errors} errors and ${a.warnings} warnings.">
<title>Sample app: ${b.errors} errors and ${b.warnings} warnings before, ${a.errors} and ${a.warnings} after</title>
<style>text{font-family:${FONT}}</style>
<rect width="${width}" height="${height}" rx="10" fill="${COLORS.bg}"/>
<text x="32" y="38" fill="${COLORS.text}" font-size="15" font-weight="bold">examples/habit-tracker, checked before and after an agent ran the skills</text>
${col(32, 'Before', `${b.errors} errors`, COLORS.error, `${b.warnings} warnings`)}
<text x="236" y="116" fill="${COLORS.dim}" font-size="30">→</text>
${col(296, 'After', `${a.errors} errors`, COLORS.ok, `${a.warnings} warnings`)}
<line x1="520" y1="56" x2="520" y2="${height - 28}" stroke="#30363d"/>
<text x="548" y="70" fill="${COLORS.dim}" font-size="14">What the agent changed</text>
${changes.map((c, i) => `<text x="548" y="${98 + i * 24}" fill="${COLORS.text}" font-size="13"><tspan fill="${COLORS.ok}">✓ </tspan>${esc(c)}</text>`).join('\n')}
<text x="32" y="196" fill="${COLORS.dim}" font-size="14">Files it wrote under store/</text>
${files.map((f, i) => `<text x="${32 + (i % 2) * 230}" y="${224 + Math.floor(i / 2) * 22}" fill="${COLORS.prompt}" font-size="13">${esc(f)}</text>`).join('\n')}
</svg>
`;
}

const before = parseReport(readFileSync(BEFORE, 'utf8'));
const after = parseReport(readFileSync(AFTER, 'utf8'));
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/check.svg`, terminalSvg(before));
writeFileSync(`${OUT}/before-after.svg`, beforeAfterSvg(before, after));
console.log(`wrote ${OUT}/check.svg (${before.rows.filter((r) => r.kind !== 'section').length} issues) and ${OUT}/before-after.svg`);
