import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { main } from '../src/cli.js';
import { check } from '../src/run-checks.js';
import { verifyUrl } from '../src/verify-urls.js';
import { expoProject, makeProject } from './helpers/project.js';

/** @type {http.Server} */
let server;
let base = '';
/** @type {string[]} */
const requests = [];

before(async () => {
  server = http.createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    if (req.url === '/privacy') return res.writeHead(200, { 'content-type': 'text/html' }).end('<h1>Privacy</h1>');
    if (req.url === '/moved') return res.writeHead(301, { location: '/privacy' }).end();
    if (req.url === '/moved-to-missing') return res.writeHead(302, { location: '/missing' }).end();
    if (req.url === '/no-head') return res.writeHead(req.method === 'HEAD' ? 405 : 200).end(req.method === 'HEAD' ? undefined : 'ok');
    if (req.url === '/slow') return setTimeout(() => res.writeHead(200).end(), 2000);
    res.writeHead(404).end('not found');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

after(() => {
  server.closeAllConnections?.();
  server.close();
});

describe('verifyUrl', () => {
  it('accepts 2xx and followed redirects with HEAD', async () => {
    assert.deepEqual(await verifyUrl(`${base}/privacy`), { ok: true, status: 200 });
    assert.deepEqual(await verifyUrl(`${base}/moved`), { ok: true, status: 200 });
    assert.ok(requests.includes('HEAD /privacy'));
  });

  it('falls back to GET when HEAD is refused', async () => {
    assert.deepEqual(await verifyUrl(`${base}/no-head`), { ok: true, status: 200 });
    assert.ok(requests.includes('HEAD /no-head') && requests.includes('GET /no-head'));
  });

  it('reports 404s, redirects to a 404, timeouts and refused connections', async () => {
    assert.deepEqual(await verifyUrl(`${base}/missing`), { ok: false, status: 404 });
    assert.deepEqual(await verifyUrl(`${base}/moved-to-missing`), { ok: false, status: 404 });
    const slow = await verifyUrl(`${base}/slow`, { timeoutMs: 150 });
    assert.equal(slow.ok, false);
    assert.match(slow.ok ? '' : slow.error ?? '', /no response within 0\.2 s/);
    const refused = await verifyUrl('http://127.0.0.1:9/privacy', { timeoutMs: 2000 });
    assert.equal(refused.ok, false);
    assert.match(refused.ok ? '' : refused.error ?? '', /^network error/);
    assert.deepEqual(await verifyUrl('ftp://example.com/privacy'), { ok: false, error: 'not an http(s) URL' });
  });
});

describe('--verify-urls', () => {
  /** @param {string[]} args @param {string} cwd */
  async function run(args, cwd) {
    let stdout = '';
    let stderr = '';
    const code = await main(args, { stdout: { write: (t) => { stdout += t; } }, stderr: { write: (t) => { stderr += t; } }, cwd, env: {}, timeoutMs: 1000 });
    return { code, stdout, stderr };
  }

  it('stays offline by default', () => {
    const before = requests.length;
    const root = makeProject(expoProject({ extra: { privacyPolicyUrl: `${base}/missing-privacy` } }));
    const result = check(root, { cwd: root });
    const issue = result.issues.find((entry) => entry.id === 'privacy.policy-url');
    assert.equal(issue?.severity, 'info');
    assert.match(issue?.message ?? '', /Not verified/);
    assert.equal(requests.length, before);
  });

  it('turns a failing privacy, support or deletion URL into an error and a working one into info', async () => {
    const root = makeProject(expoProject({
      ios: { bundleIdentifier: 'com.acme.app', buildNumber: '1' },
      android: { package: 'com.acme.app', versionCode: 1 },
      extra: { privacyPolicyUrl: `${base}/privacy`, supportUrl: `${base}/no-head`, deleteAccountUrl: `${base}/missing` },
    }));
    const { code, stdout } = await run(['check', root, '--json', '--verify-urls'], root);
    assert.equal(code, 1);
    const result = JSON.parse(stdout);
    assert.deepEqual(Object.keys(result), ['version', 'project', 'issues', 'summary']);
    const byUrl = (suffix) => result.issues.find((issue) => issue.message.includes(`${base}${suffix} `) || issue.message.includes(`${base}${suffix}.`));
    assert.equal(byUrl('/privacy')?.severity, 'info');
    assert.match(byUrl('/privacy')?.message ?? '', /answered HTTP 200 \(--verify-urls\)\. Only the response code was checked/);
    assert.equal(byUrl('/no-head')?.severity, 'info');
    const deletion = byUrl('/missing');
    assert.equal(deletion?.severity, 'error');
    assert.equal(deletion?.id, 'app.links');
    assert.match(deletion?.message ?? '', /returned HTTP 404 \(--verify-urls\); Google Play requires the web deletion link to load without error/);
  });

  it('keeps usage errors as exit 2', async () => {
    const { code, stderr } = await run(['check', 'does-not-exist', '--verify-urls'], process.cwd());
    assert.equal(code, 2);
    assert.match(stderr, /^store-ready: Not a directory/);
  });
});
