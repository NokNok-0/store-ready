import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { UsageError } from './project/usage-error.js';
import { formatGithub } from './report/github.js';
import { formatHuman } from './report/human.js';
import { stripControl } from './report/sanitize.js';
import { check, checkAsync } from './run-checks.js';

export const EXIT_OK = 0;
export const EXIT_FAILED = 1;
export const EXIT_USAGE = 2;

const PLATFORMS = ['ios', 'android', 'both'];

export const HELP = `Usage: store-ready check [path] [options]

Checks an Expo, React Native, iOS or Android project for issues that get apps
rejected in App Store and Google Play review. Reads files only; no network
unless you pass --verify-urls.

Options
  --json               Print results as JSON
  --github             Print GitHub Actions annotations
  --platform <name>    ios, android or both (default: both)
  --config <file>      Expo config as JSON. Best: npx expo config --type introspect --json
                       (includes the purpose strings config plugins write)
  --strict             Fail on warnings as well as errors
  --verify-urls        Open the privacy, support and deletion URLs found (HTTP HEAD,
                       fallback GET, 10 s timeout); failures are errors
  -h, --help           Show this help
  -v, --version        Show the version

Exit codes
  0  no errors (and no warnings with --strict)
  1  errors found (or warnings with --strict)
  2  usage error
`;

export function packageVersion() {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  return String(pkg.version);
}

/**
 * @typedef {{ stdout: { write: (text: string) => unknown, isTTY?: boolean }, stderr: { write: (text: string) => unknown }, cwd: string, env: Record<string, string | undefined>, fetchImpl?: typeof fetch, timeoutMs?: number }} Io
 */

/**
 * Synchronous unless --verify-urls is given; then it returns a promise of the exit code.
 * @param {string[]} argv
 * @param {Io} io
 * @returns {number | Promise<number>} exit code
 */
export function main(argv, io) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        json: { type: 'boolean', default: false },
        github: { type: 'boolean', default: false },
        platform: { type: 'string', default: 'both' },
        config: { type: 'string' },
        strict: { type: 'boolean', default: false },
        'verify-urls': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    });
  } catch (error) {
    return usage(io, error instanceof Error ? error.message : String(error));
  }
  const { values, positionals } = parsed;
  if (values.version) {
    io.stdout.write(`${packageVersion()}\n`);
    return EXIT_OK;
  }
  if (values.help || positionals.length === 0) {
    io.stdout.write(HELP);
    return EXIT_OK;
  }
  const [command, target = '.', ...extra] = positionals;
  if (command !== 'check') return usage(io, `Unknown command "${command}".`);
  if (extra.length > 0) return usage(io, `Unexpected argument "${extra[0]}".`);
  if (!PLATFORMS.includes(values.platform)) return usage(io, `--platform must be ios, android or both (got "${values.platform}").`);
  if (values.json && values.github) return usage(io, 'Use either --json or --github, not both.');

  const options = {
    platform: /** @type {'ios' | 'android' | 'both'} */ (values.platform),
    configFile: values.config,
    cwd: io.cwd,
  };
  if (values['verify-urls']) {
    return checkAsync(target, { ...options, verifyUrls: true, fetchImpl: io.fetchImpl, timeoutMs: io.timeoutMs }).then(
      (result) => report(result, values, io),
      (error) => {
        if (error instanceof UsageError) return usage(io, error.message);
        throw error;
      },
    );
  }
  let result;
  try {
    result = check(target, options);
  } catch (error) {
    if (error instanceof UsageError) return usage(io, error.message);
    throw error;
  }
  return report(result, values, io);
}

/**
 * @param {import('./run-checks.js').CheckResult} result
 * @param {{ json?: boolean, github?: boolean, strict?: boolean }} values
 * @param {Io} io
 */
function report(result, values, io) {
  if (values.json) io.stdout.write(`${toJson(result)}\n`);
  else if (values.github) io.stdout.write(formatGithub(result, { cwd: io.cwd }));
  else io.stdout.write(formatHuman(result, { color: useColor(io), strict: Boolean(values.strict), version: packageVersion() }));

  const failed = result.summary.errors > 0 || (values.strict && result.summary.warnings > 0);
  return failed ? EXIT_FAILED : EXIT_OK;
}

/** @param {{ stderr: { write: (text: string) => unknown } }} io @param {string} message */
function usage(io, message) {
  io.stderr.write(`store-ready: ${stripControl(message)}\nRun "store-ready --help" for usage.\n`);
  return EXIT_USAGE;
}

/** JSON.stringify escapes C0 controls but writes DEL and C1 controls raw. @param {unknown} value */
export function toJson(value) {
  return JSON.stringify(value, null, 2).replace(/[\u007f-\u009f]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/** @param {{ stdout: { isTTY?: boolean }, env: Record<string, string | undefined> }} io */
function useColor(io) {
  if (io.env.NO_COLOR !== undefined && io.env.NO_COLOR !== '') return false;
  if (io.env.FORCE_COLOR !== undefined && io.env.FORCE_COLOR !== '0') return true;
  return Boolean(io.stdout.isTTY) && io.env.TERM !== 'dumb';
}
