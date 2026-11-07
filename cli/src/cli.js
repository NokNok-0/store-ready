import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { UsageError } from './project/usage-error.js';
import { formatGithub } from './report/github.js';
import { formatHuman } from './report/human.js';
import { check } from './run-checks.js';

export const EXIT_OK = 0;
export const EXIT_FAILED = 1;
export const EXIT_USAGE = 2;

const PLATFORMS = ['ios', 'android', 'both'];

export const HELP = `Usage: store-ready check [path] [options]

Checks an Expo, React Native, iOS or Android project for issues that get apps
rejected in App Store and Google Play review. Reads files only; no network.

Options
  --json               Print results as JSON
  --github             Print GitHub Actions annotations
  --platform <name>    ios, android or both (default: both)
  --config <file>      Expo config as JSON, from: npx expo config --json
  --strict             Fail on warnings as well as errors
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
 * @param {string[]} argv
 * @param {{ stdout: { write: (text: string) => unknown, isTTY?: boolean }, stderr: { write: (text: string) => unknown }, cwd: string, env: Record<string, string | undefined> }} io
 * @returns {number} exit code
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

  let result;
  try {
    result = check(target, {
      platform: /** @type {'ios' | 'android' | 'both'} */ (values.platform),
      configFile: values.config,
      cwd: io.cwd,
    });
  } catch (error) {
    if (error instanceof UsageError) return usage(io, error.message);
    throw error;
  }

  if (values.json) io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else if (values.github) io.stdout.write(formatGithub(result, { cwd: io.cwd }));
  else io.stdout.write(formatHuman(result, { color: useColor(io), strict: values.strict, version: packageVersion() }));

  const failed = result.summary.errors > 0 || (values.strict && result.summary.warnings > 0);
  return failed ? EXIT_FAILED : EXIT_OK;
}

/** @param {{ stderr: { write: (text: string) => unknown } }} io @param {string} message */
function usage(io, message) {
  io.stderr.write(`store-ready: ${message}\nRun "store-ready --help" for usage.\n`);
  return EXIT_USAGE;
}

/** @param {{ stdout: { isTTY?: boolean }, env: Record<string, string | undefined> }} io */
function useColor(io) {
  if (io.env.NO_COLOR !== undefined && io.env.NO_COLOR !== '') return false;
  if (io.env.FORCE_COLOR !== undefined && io.env.FORCE_COLOR !== '0') return true;
  return Boolean(io.stdout.isTTY) && io.env.TERM !== 'dumb';
}
