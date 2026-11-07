#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (file, message) => errors.push(`${file}: ${message}`);

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ALLOWED_KEYS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
const MAX_BODY_LINES = 300;
const SOURCES_MAX_AGE_DAYS = 90;

function parseFrontmatter(text, file) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    fail(file, "missing frontmatter");
    return null;
  }
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (!kv) {
      fail(file, `unparseable frontmatter line: ${line}`);
      continue;
    }
    fields[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { fields, body: match[2] };
}

function checkLinks(body, dir, file) {
  for (const [, target] of body.matchAll(/\]\(((?:references|scripts|assets)\/[^)#\s]+)\)/g)) {
    if (!existsSync(join(dir, target))) fail(file, `broken link ${target}`);
  }
}

function validateSkills() {
  const skillsDir = join(root, "skills");
  const names = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
  for (const name of names) {
    const dir = join(skillsDir, name);
    const file = `skills/${name}/SKILL.md`;
    if (!existsSync(join(dir, "SKILL.md"))) {
      fail(`skills/${name}`, "missing SKILL.md");
      continue;
    }
    const parsed = parseFrontmatter(readFileSync(join(dir, "SKILL.md"), "utf8"), file);
    if (!parsed) continue;
    const { fields, body } = parsed;
    for (const key of Object.keys(fields)) if (!ALLOWED_KEYS.has(key)) fail(file, `frontmatter key not in the Agent Skills spec: ${key}`);
    if (fields.name !== name) fail(file, `name "${fields.name}" must match directory "${name}"`);
    if (!NAME.test(fields.name ?? "") || fields.name.length > 64) fail(file, "invalid name");
    const description = fields.description ?? "";
    if (description.length < 1 || description.length > 1024) fail(file, `description length ${description.length} not in 1..1024`);
    const lines = body.split(/\r?\n/).length;
    if (lines > MAX_BODY_LINES) fail(file, `body is ${lines} lines, limit ${MAX_BODY_LINES}`);
    if (!/^#{1,3} Verify/m.test(body)) fail(file, "missing a Verify section");
    checkLinks(body, dir, file);
  }
  return names;
}

function validateAgents() {
  const dir = join(root, "agents");
  for (const entry of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const file = `agents/${entry}`;
    const parsed = parseFrontmatter(readFileSync(join(dir, entry), "utf8"), file);
    if (!parsed) continue;
    if (parsed.fields.name !== entry.replace(/\.md$/, "")) fail(file, "name must match file name");
    if (!parsed.fields.description) fail(file, "missing description");
  }
}

function validateManifests() {
  const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
  const versions = {
    ".claude-plugin/plugin.json": read(".claude-plugin/plugin.json").version,
    ".claude-plugin/marketplace.json": read(".claude-plugin/marketplace.json").plugins[0].version,
    ".codex-plugin/plugin.json": read(".codex-plugin/plugin.json").version,
    ".cursor-plugin/plugin.json": read(".cursor-plugin/plugin.json").version,
    "gemini-extension.json": read("gemini-extension.json").version,
    "cli/package.json": existsSync(join(root, "cli/package.json")) ? read("cli/package.json").version : undefined,
  };
  const distinct = new Set(Object.values(versions).filter(Boolean));
  if (distinct.size > 1) fail("manifests", `versions differ: ${JSON.stringify(versions)}`);
}

function validateAgentsMd(skillNames) {
  const text = readFileSync(join(root, "AGENTS.md"), "utf8");
  for (const name of skillNames) if (!text.includes(`skills/${name}`)) fail("AGENTS.md", `skill ${name} is not listed`);
}

function validateSources() {
  const dir = join(root, "docs/sources");
  for (const entry of readdirSync(dir)) {
    const text = readFileSync(join(dir, entry), "utf8");
    const checked = text.match(/Checked (\d{4}-\d{2}-\d{2})/);
    if (!checked) {
      fail(`docs/sources/${entry}`, "missing 'Checked YYYY-MM-DD' line");
      continue;
    }
    const age = (Date.now() - Date.parse(checked[1])) / 86_400_000;
    if (age > SOURCES_MAX_AGE_DAYS) fail(`docs/sources/${entry}`, `rules last checked ${checked[1]}, over ${SOURCES_MAX_AGE_DAYS} days ago`);
  }
}

const skillNames = validateSkills();
validateAgents();
validateManifests();
validateAgentsMd(skillNames);
if (!process.argv.includes("--skip-freshness")) validateSources();

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`ok: ${skillNames.length} skills, agents, manifests and sources valid`);
