import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { main } from '../src/cli.js';
import { CLI_ROOT, expoProject, makeProject, materializeFixture } from './helpers/project.js';

const BIN = path.join(CLI_ROOT, 'bin', 'store-ready.mjs');

/** @param {string[]} args @param {string} [cwd] */
function run(args, cwd = CLI_ROOT) {
  let stdout = '';
  let stderr = '';
  const code = main(args, {
    stdout: { write: (text) => { stdout += text; } },
    stderr: { write: (text) => { stderr += text; } },
    cwd,
    env: {},
  });
  return { code, stdout, stderr };
}

const good = materializeFixture('good-expo');
const bad = materializeFixture('bad-expo');
const warningsOnly = makeProject(expoProject({
  version: '1.0.0',
  icon: './icon.png',
  platforms: ['android'],
  android: { package: 'com.example.app', versionCode: 1 },
}, {}, { 'icon.png': '' }));

describe('store-ready CLI', () => {
  it('prints the version and help', () => {
    assert.match(run(['--version']).stdout, /^\d+\.\d+\.\d+\n$/);
    assert.match(run(['--help']).stdout, /Usage: store-ready check \[path\]/);
    assert.match(run(['--help']).stdout, /--verify-urls/);
    assert.match(run(['--help']).stdout, /npx expo config --type introspect --json/);
    assert.equal(run([]).code, 0);
  });

  it('exits 0 on a clean project and says it passes the checks we know about', () => {
    const { code, stdout } = run(['check', good]);
    assert.equal(code, 0);
    assert.match(stdout, /0 errors, 0 warnings, 4 info\nPasses the checks we know about\./);
    assert.doesNotMatch(stdout, /approved|will pass review/i);
  });

  it('exits 1 on errors and groups human output by platform', () => {
    const { code, stdout } = run(['check', bad]);
    assert.equal(code, 1);
    const ios = stdout.indexOf('\niOS\n');
    const android = stdout.indexOf('\nAndroid\n');
    const both = stdout.indexOf('\nBoth platforms\n');
    assert.ok(ios > 0 && android > ios && both > android);
    assert.match(stdout, /ERROR {2}ios\.purpose-strings {2}app\.json\n {9}NSCameraUsageDescription is not set/);
    assert.match(stdout, /\n {9}Fix: {4}\S/);
    assert.match(stdout, /\n {9}Source: https:\/\//);
    assert.match(stdout, /Fix the errors above/);
    assert.doesNotMatch(stdout, /Passes the checks/);
  });

  it('fails on warnings only with --strict', () => {
    const relaxed = run(['check', warningsOnly]);
    assert.equal(relaxed.code, 0, relaxed.stdout);
    assert.match(relaxed.stdout, /[1-9]\d* warnings?/);
    assert.match(relaxed.stdout, /\nCode and config pass the checks we know about\. Not checked yet: store\/listing\.android\.json, store\/data-safety\.android\.md, store\/screenshots\/android\/\./);
    const strict = run(['check', warningsOnly, '--strict']);
    assert.equal(strict.code, 1);
    assert.match(strict.stdout, /Warnings fail with --strict/);
  });

  it('prints the documented JSON shape', () => {
    const { code, stdout } = run(['check', bad, '--json']);
    assert.equal(code, 1);
    const result = JSON.parse(stdout);
    assert.deepEqual(Object.keys(result), ['version', 'project', 'issues', 'summary']);
    assert.equal(result.version, 1);
    assert.deepEqual(result.project, { type: 'expo', path: bad });
    for (const issue of result.issues) {
      assert.deepEqual(Object.keys(issue).filter((key) => key !== 'file'), ['id', 'severity', 'platform', 'message', 'fix', 'source']);
      assert.ok(['error', 'warning', 'info'].includes(issue.severity));
      assert.ok(['ios', 'android', 'both'].includes(issue.platform));
      assert.match(issue.source, /^https:\/\//);
      if ('file' in issue) assert.equal(typeof issue.file, 'string');
    }
    const count = (severity) => result.issues.filter((issue) => issue.severity === severity).length;
    assert.deepEqual(result.summary, { errors: count('error'), warnings: count('warning'), infos: count('info') });
  });

  it('filters by --platform, keeping issues for both', () => {
    const ios = JSON.parse(run(['check', bad, '--json', '--platform', 'ios']).stdout);
    assert.ok(ios.issues.length > 0);
    assert.ok(ios.issues.every((issue) => issue.platform !== 'android'));
    assert.ok(ios.issues.some((issue) => issue.platform === 'both'));
    const android = JSON.parse(run(['check', bad, '--json', '--platform', 'android']).stdout);
    assert.ok(android.issues.every((issue) => issue.platform !== 'ios'));
  });

  it('prints GitHub annotations with paths relative to cwd', () => {
    const { code, stdout } = run(['check', '.', '--github'], bad);
    assert.equal(code, 1);
    const lines = stdout.trim().split('\n');
    assert.match(lines[0], /^::error file=app\.json,title=ios\.purpose-strings \(ios\)::NSCameraUsageDescription/);
    assert.ok(lines.some((line) => line.startsWith('::warning ')));
    assert.ok(lines.some((line) => line.startsWith('::notice title=play.closed-testing (android)::')));
    assert.ok(lines.slice(0, -1).every((line) => /^::(error|warning|notice) /.test(line) && !line.includes('\n')));
    assert.match(lines.at(-1) ?? '', /^store-ready: \d+ errors, \d+ warnings, \d+ info$/);
  });

  it('exits 2 on usage errors', () => {
    for (const args of [['lint'], ['check', '--nope'], ['check', good, '--platform', 'web'], ['check', path.join(good, 'missing')], ['check', good, '--json', '--github'], ['check', good, 'extra'], ['check', good, '--config', 'missing.json']]) {
      const { code, stderr } = run(args);
      assert.equal(code, 2, args.join(' '));
      assert.match(stderr, /^store-ready: /);
    }
  });

  it('runs as an executable via bin/store-ready.mjs', () => {
    const ok = spawnSync(process.execPath, [BIN, 'check', good, '--json'], { encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).summary.errors, 0);
    const failed = spawnSync(process.execPath, [BIN, 'check', bad], { encoding: 'utf8' });
    assert.equal(failed.status, 1);
    const usage = spawnSync(process.execPath, [BIN, 'check', '--platform'], { encoding: 'utf8' });
    assert.equal(usage.status, 2);
  });
});
