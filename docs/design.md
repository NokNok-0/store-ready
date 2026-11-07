# store-ready: design

## Intent

People now build working mobile apps with AI coding agents in a weekend, then lose weeks to the part after: App Store rejections, Play policy declarations, privacy forms, screenshots, signing, a 14-day closed test nobody warned them about. store-ready is the part after. It is a set of agent skills plus a deterministic checker that take an app from "it runs" to "it passes review", for Expo, React Native and native iOS/Android projects.

Tagline: **Your AI built the app. store-ready gets it approved.**

## Who it is for

- Builders who made an app with Claude Code, Codex, Cursor or Gemini CLI and have never shipped to a store.
- Indie developers who have shipped before and want the compliance work done right and fast.
- Agencies submitting many apps who need a repeatable pre-submission check.

## Goals

1. Catch, before submission, the issues that actually get apps rejected, with every rule traced to an official source and a checked date.
2. Produce the submission artifacts the user would otherwise write by hand: store listing text within limits, review notes, privacy and data-safety answers, purpose strings, a reply to a rejection.
3. Work in Claude Code, Codex, Cursor and Gemini CLI from one source.
4. Prove it works: a sample app in the repo that passes the checker, with the generated artifacts committed.

## Non-goals

- Teaching how to write React Native, SwiftUI or Kotlin. expo/skills, swift-ios-skills and android/skills already do this; we point to them.
- Replacing EAS, fastlane or the store consoles. We prepare inputs for them and tell the user which buttons to press.
- Uploading anything to Apple or Google on the user's behalf.

## Anti-goals (failure even if it works)

- A document factory. The top complaint about Claude-Code-Game-Studios is "lots of docs, nothing shipped". Every skill must end in a change to the project or a file the user pastes into a console.
- Stating a store rule from memory. If a fact is not in `docs/sources/`, a skill says "check the current page" and links it.
- Claiming an app "will be approved". We say "passes the checks we know about".
- Forty agents. Five roles, each with a clear job.
- Filler: no marketing adjectives in generated listings, no fake checklists, no AI-style comments in code we write.

## The pieces

### 1. Skills (`skills/<name>/SKILL.md`)

Spec-pure Agent Skills (https://agentskills.io/specification): `name` matches the directory, `description` under 1024 characters with trigger words, body under 500 lines, details in `references/`. Each skill ends with a concrete output and a "verify" step.

| Skill | Job | Output |
|---|---|---|
| `store-ready` | Entry point. Detects the project type and stage, runs the checker, routes to the right skills in order | A short status report and next step |
| `app-review-risk` | Before or early in building: flags minimum-functionality, spam, copycat, template and regulated-field risks (Apple 4.2/4.3/4.1/4.2.6/5.1.1(ix), Play spam and functionality) | Risk list with concrete changes |
| `ios-privacy` | Purpose strings, privacy manifest required-reason APIs, App Privacy label answers, tracking permission rules, AI data sharing consent | Edited app config / Info.plist / PrivacyInfo, plus label answers file |
| `play-data-safety` | Data safety form answers including SDK data, permission declarations (photo/video, background location, exact alarm, foreground service), target API | Form answers file, manifest fixes |
| `account-deletion` | In-app deletion flow for both stores, web deletion link for Play, Sign in with Apple token revocation | Code changes plus the URL fields to fill |
| `login-and-payments` | Apple 4.8 equivalent login, 3.1.1 IAP vs external links (US storefront rule), Play billing basics | Decision and required changes |
| `store-listing` | Name, subtitle, keywords (100 bytes), descriptions, promotional text for both stores, honest and within limits | `store/listing.{ios,android}.json` |
| `store-screenshots` | Required sizes, "more than half show the app in use", capture plan from simulator or web, framing script | Screenshot plan and generated images |
| `age-rating` | Apple questionnaire (new 2026 descriptors) and Play IARC answers | Answers file |
| `review-notes` | Demo accounts for each role, expired-subscription account, steps to reach features, 4,000-byte limit | `store/review-notes.txt` |
| `submission-checklist` | Everything outside the code: Xcode 26 SDK, export compliance, EU trader status, Play 12 testers for 14 days, D-U-N-S, AAB, Play App Signing, EAS build and submit steps | Checklist with status per item |
| `rejection-fix` | Paste a rejection; map it to the guideline, find the cause in the code, fix it, draft the reply | Fix plus reply text |
| `mock-review` | Acts as a strict App Review and Play reviewer against the current build and metadata, before the real one does | Findings in the stores' own format |

### 2. Agents (`agents/*.md`)

Five Claude Code subagents. Other tools get the same roles described in `AGENTS.md`.

- `product-lead`: scope, review risk, one-page brief. Never writes more than one page.
- `app-engineer`: code changes required by compliance (deletion flow, purpose strings, manifests). Defers framework depth to the framework's own skills.
- `app-reviewer`: plays Apple App Review and Google Play review; read-only; cites guideline numbers.
- `store-marketer`: listing text and screenshots; follows limits and 2.3.x rules.
- `release-manager`: credentials, builds, submission checklist, rejection replies.

### 3. The checker (`cli/`, published as `store-ready`)

`npx store-ready check [path]` reads the project and reports issues with the rule, a fix, and the source URL. No network, no account, Node 20+, minimal dependencies.

Checks for v1 (Expo and bare React Native first; native iOS/Android projects read where files exist):

- Purpose strings present and specific for every permission the app requests (iOS) and declared Android permissions that need Play declarations.
- Privacy manifest declares reasons for required-reason API categories used by the app's dependencies where detectable (UserDefaults via AsyncStorage and similar), and reason codes are valid.
- Android target SDK at least 36.
- iOS bundle identifier and Android package set; version and build number present.
- App icon exists, 1024×1024 for iOS source, no alpha where it matters for the store asset; Play icon 512×512 if provided.
- Sign-up detected without an account deletion path (heuristic, reported as a warning).
- Third-party login without Sign in with Apple or an equivalent (heuristic warning).
- Privacy policy URL configured.
- Store listing files (if present) within each field's limits, keywords counted in bytes.
- Screenshots (if present) match required sizes and formats.

Output: human-readable by default, `--json`, and `--github` for annotations. Exit code 1 on errors. Every check has fixture tests.

### 4. Evals (`evals/`)

- Trigger evals: for each skill, prompts that should and should not trigger it.
- Task evals: rejection messages with the expected guideline and fix; flawed sample projects with the expected findings.
- Checker tests run in CI on every change; skill evals run on demand with a script and a model judge, results recorded in `evals/results/`.

### 5. Proof (`examples/`)

A small but real Expo SDK 58 app (habit tracker with an account, local data, a photo, an optional subscription stub) built with the pack: passes `store-ready check`, includes the generated listing, review notes, privacy answers and screenshots. Also a `before/` copy with the issues the checker caught, for the README demo.

### 6. Packaging

One source of truth (`skills/`, `agents/`), with manifests for each tool: `.claude-plugin/marketplace.json` and `plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `gemini-extension.json` with `GEMINI.md`, `AGENTS.md`. Universal fallback: `npx skills add NokNok-0/store-ready`. CI checks manifests stay in sync, skills validate against the spec, and bodies stay under 500 lines.

### 7. Freshness

Store rules change several times a year. Every rule in a skill links to its source; `docs/sources/*.md` records the checked date; a scheduled workflow opens an issue when sources are older than 90 days. The README states the date rules were last checked.

## Decisions made by the builder (not by the user)

- Name `store-ready`, MIT license, Node for the checker, Expo as the default stack.
- Five agents, thirteen skills for v1.
- English only for v1.
- Sample app scope as above; built and checked locally; real store submission is left to the user's own accounts.

## Constraints

- Development machine is Windows without the Android SDK or Xcode: native builds run on EAS in the cloud, under the user's account. The sample app is verified with Expo's checks, unit tests, web rendering and bundle export.
- Nothing is published (GitHub public, npm, marketplaces) without the user's go-ahead.
