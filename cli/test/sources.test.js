import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { SOURCES } from '../src/sources.js';
import { check } from '../src/run-checks.js';
import { CLI_ROOT, materializeFixture } from './helpers/project.js';

const SOURCES_DIR = path.join(CLI_ROOT, '..', 'docs', 'sources');

function documentedUrls() {
  const urls = new Set();
  for (const name of fs.readdirSync(SOURCES_DIR).filter((file) => file.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(SOURCES_DIR, name), 'utf8');
    for (const match of text.matchAll(/https?:\/\/[^\s)>`"]+/g)) urls.add(match[0].replace(/[.,:;]+$/, ''));
  }
  return urls;
}

describe('rule sources', { skip: !fs.existsSync(SOURCES_DIR) && 'docs/sources not present' }, () => {
  const urls = documentedUrls();

  it('every source URL used by the checker is listed in docs/sources', () => {
    for (const [name, url] of Object.entries(SOURCES)) assert.ok(urls.has(url), `${name}: ${url} is not in docs/sources/*.md`);
  });

  it('every issue the fixtures produce cites a documented source', () => {
    for (const fixture of ['good-expo', 'bad-expo']) {
      for (const issue of check(materializeFixture(fixture)).issues) assert.ok(urls.has(issue.source), `${issue.id}: ${issue.source}`);
    }
  });
});
