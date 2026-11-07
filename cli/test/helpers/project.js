import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeIssue } from '../../src/issue.js';
import { loadProject } from '../../src/project/load-project.js';
import { makeJpeg, makePng } from './images.js';

export const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/', import.meta.url));
export const CLI_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** @type {string[]} */
const created = [];
process.on('exit', () => {
  for (const dir of created) fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'store-ready-test-')));
  created.push(dir);
  return dir;
}

/**
 * Writes files into a fresh temp directory. Values: string, Buffer, or a plain object written as JSON.
 * @param {Record<string, string | Buffer | object>} files
 */
export function makeProject(files) {
  const root = tempDir();
  writeFiles(root, files);
  return root;
}

/** @param {string} root @param {Record<string, string | Buffer | object>} files */
export function writeFiles(root, files) {
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const data = typeof content === 'string' || Buffer.isBuffer(content) ? content : `${JSON.stringify(content, null, 2)}\n`;
    fs.writeFileSync(file, data);
  }
}

/**
 * Copies a fixture to a temp directory and creates the binary and large files listed in its generated.json.
 * @param {string} name
 */
export function materializeFixture(name) {
  const root = tempDir();
  fs.cpSync(path.join(FIXTURES_DIR, name), root, { recursive: true });
  const manifestPath = path.join(root, 'generated.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    fs.rmSync(manifestPath);
    /** @type {Record<string, string | Buffer>} */
    const files = {};
    for (const [relative, spec] of Object.entries(manifest.images ?? {})) {
      files[relative] = spec.jpeg ? makeJpeg(spec.jpeg[0], spec.jpeg[1]) : makePng(spec.png[0], spec.png[1], { alpha: Boolean(spec.alpha) });
    }
    for (const [relative, spec] of Object.entries(manifest.text ?? {})) {
      files[relative] = spec.repeat.repeat(Math.ceil(spec.bytes / Buffer.byteLength(spec.repeat)));
    }
    writeFiles(root, files);
  }
  return root;
}

/**
 * @param {{ id: string, run: Function }} checkModule
 * @param {Record<string, string | Buffer | object> | string} filesOrRoot
 * @param {{ configFile?: string }} [options]
 */
export function runCheck(checkModule, filesOrRoot, options = {}) {
  const root = typeof filesOrRoot === 'string' ? filesOrRoot : makeProject(filesOrRoot);
  const project = loadProject(root, { cwd: root, ...options });
  return checkModule.run(project).map((/** @type {any} */ raw) => normalizeIssue(checkModule.id, raw));
}

/**
 * A minimal Expo project: package.json with the given dependencies and app.json with the given expo config.
 * @param {Record<string, any>} expo
 * @param {Record<string, string>} [dependencies]
 * @param {Record<string, string | Buffer | object>} [extra]
 */
export function expoProject(expo, dependencies = {}, extra = {}) {
  return {
    'package.json': { name: 'test-app', version: '1.0.0', dependencies: { expo: '~58.0.0', ...dependencies } },
    'app.json': { expo: { name: 'Test', slug: 'test', ...expo } },
    ...extra,
  };
}
