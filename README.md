<div align="center">

# store-ready

**Your AI built the app. store-ready gets it ready for review.**

Agent skills and a checker that take a mobile app from "it runs" to "ready for App Store and Google Play review".
Works with Claude Code, Codex, Cursor, Gemini CLI and any agent that reads Agent Skills.

[![ci](https://github.com/NokNok-0/store-ready/actions/workflows/ci.yml/badge.svg)](https://github.com/NokNok-0/store-ready/actions/workflows/ci.yml)
![skills](https://img.shields.io/badge/skills-13-blue) ![checks](https://img.shields.io/badge/checks-15-blue)
![rules checked](https://img.shields.io/badge/store%20rules%20checked-2026--11--07-green)
[![license](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

</div>

```text
$ npx store-ready check examples/habit-tracker

iOS
  ERROR  ios.purpose-strings  app.json
         NSCameraUsageDescription is not set, but expo-image-picker uses that permission. Without your own
         text the app ships no purpose string or the package's generic default.
         Fix:    Add "NSCameraUsageDescription" to expo.ios.infoPlist in app.json, or set the
                 "cameraPermission" option of the expo-image-picker config plugin. Say what the app does
                 with the data and give an example.
         Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-purpose-strings

  ERROR  app.template-content  app.json
         Template artwork: assets/images/icon.png (icon) is the Expo SDK 58 default template icon.png; ...

  WARN   login.apple-equivalent  src/auth.ts
         Third-party login found (sign-in function for a third-party provider in src/auth.ts) but no
         Sign in with Apple or other equivalent login was detected.
  ...

6 errors, 13 warnings, 6 info
```

Every finding comes with the fix and a link to the official Apple or Google page it is based on. Excerpt from the [full report](examples/habit-tracker/docs/check-before.txt), wrapped for width.

## Why

Building an app with an AI agent takes a weekend now. Getting it through review still takes weeks: a rejection for a vague camera permission string, a missing "delete account" button, Google login without Sign in with Apple, a Data safety form that doesn't match the SDKs, screenshots in the wrong size, and, for new Google Play accounts, a 14-day closed test with 12 testers that nobody mentions until you hit it.

store-ready does that part. Your agent runs the checker, fixes the code, and writes the forms you paste into App Store Connect and Play Console.

## Install

**Claude Code**

```text
/plugin marketplace add NokNok-0/store-ready
/plugin install store-ready@store-ready
```

**Codex, Cursor, Gemini CLI, Copilot and other agents** ([skills CLI](https://github.com/vercel-labs/skills))

```bash
npx skills add NokNok-0/store-ready
```

**Gemini CLI extension**

```bash
gemini extensions install https://github.com/NokNok-0/store-ready
```

**Just the checker** (no agent needed)

```bash
npx store-ready check
```

Install the skills one way only. Installing both the plugin and the skills CLI gives you every skill twice.

## Use

Ask your agent:

> Get my app ready for the App Store and Google Play.

The `store-ready` skill detects the project (Expo, bare React Native, native iOS or Android), runs the checker, asks only what it can't find in the project, and works through the other skills in order. Each one changes the code or writes a file under `store/`:

| Skill | What you get |
|---|---|
| `app-review-risk` | Minimum functionality, spam, copycat and regulated-field risks, with the smallest change that fixes each |
| `login-and-payments` | Sign in with Apple where guideline 4.8 needs it; in-app purchase vs external links |
| `account-deletion` | An in-app deletion flow and the web deletion link Google Play requires |
| `ios-privacy` | Specific purpose strings, privacy manifest reasons, App Privacy answers (`store/privacy.ios.md`) |
| `play-data-safety` | Data safety answers, permission declarations, target API 36 (`store/data-safety.android.md`) |
| `age-rating` | Apple age rating and IARC answers from what the code actually does |
| `store-listing` | Name, subtitle, keywords (measured in bytes), descriptions, within every limit |
| `store-screenshots` | The required sizes, a capture plan, and a size and alpha checker |
| `review-notes` | Demo accounts and reviewer steps under 4,000 bytes; Play sign-in details |
| `submission-checklist` | Accounts, signing, EAS build and submit, export compliance, EU trader status, closed testing |
| `mock-review` | A strict review in the stores' own format before the real one |
| `rejection-fix` | Paste a rejection; get the cause, the fix and a short reply to App Review |

Already rejected? Paste the message and say "fix this rejection".

## Proof

[`examples/habit-tracker`](examples/habit-tracker) is a real Expo SDK 58 app, built the way a typical AI-assisted weekend app ends up: email sign-up, "Continue with Google", photos, a Pro paywall. It passes its own tests and runs.

| | Errors | Warnings |
|---|---|---|
| [Before](examples/habit-tracker/docs/check-before.txt) | 6 | 13 |
| [After](examples/habit-tracker/docs/check-after.txt), once an agent ran the pack on it | 0 | 0 |

What the agent changed, following the skills: added account deletion and Sign in with Apple (with tests), wrote specific camera and photo purpose strings, declared the privacy manifest reasons its dependencies use, blocked four Android permissions it did not need, replaced Expo's template icon, and removed a "Continue with Google" button and a disabled paywall that did nothing, because reviewers reject features that don't work (guideline 2.1).

- Everything the pack wrote is committed in [`examples/habit-tracker/store/`](examples/habit-tracker/store): listing text, review notes, App Privacy and Data safety answers, age rating, checklist and screenshots at the required sizes.
- The agent's own notes on where the skills helped and where they fell short, which drove the next round of fixes: [`evals/results/`](evals/results).
- The app is a sample; it has not been submitted. "0 errors" means it passes the checks we know about.

## The checker

`npx store-ready check [path]` reads the project without running it. No network, no account, no dependencies, Node 20+.

| Check | What it looks for |
|---|---|
| `ios.purpose-strings` | Missing or template-like `NS*UsageDescription` for the permissions your packages use |
| `ios.privacy-manifest` | Invalid reason codes; required-reason API use with no declared reason |
| `android.target-sdk` | Target SDK below 36 |
| `android.permissions` | Permissions that need a Play Console declaration |
| `app.identity` | Bundle identifier, package, version and build numbers |
| `app.icon` | Icon files and sizes |
| `account.deletion` | Sign-up without a deletion path (heuristic) |
| `login.apple-equivalent` | Third-party login without Sign in with Apple (heuristic) |
| `app.template-content` | Expo template icons, `example.com` accounts, "coming soon", unfilled `{{FIELDS}}` |
| `privacy.policy-url`, `app.links` | Privacy, support and deletion URLs: missing, or found but not yet verified |
| `store.files` | Which store files are not written yet, so a clean code check is never mistaken for "done" |
| `store.listing-limits` | Listing fields over their limits; keywords counted in bytes |
| `store.screenshots` | Sizes, display classes, counts and alpha for both stores |
| `play.closed-testing` | The 12 testers, 14 days reminder |

Flags: `--json`, `--github` (pull request annotations), `--platform ios|android`, `--strict` (warnings fail), `--config <file>` (output of `npx expo config --type introspect --json`, which includes what config plugins add), `--verify-urls` (open the links it found; public hosts only). Exit code 1 on errors. Details in [cli/README.md](cli/README.md).

Add it to CI:

```yaml
- run: npx store-ready check --github --strict
```

## Why you can trust the rules

- Every store rule lives in [`docs/sources/`](docs/sources) with the official URL next to it and the date it was checked. Skills and the checker only use rules from there.
- Anything we could not confirm on an official page is marked **unconfirmed** and is never stated as fact.
- A weekly workflow opens an issue when the rules are more than 90 days old.
- The checker says "passes the checks we know about". It never says "approved". Review also covers crashes, server behaviour and console settings no tool can see.

Store rules last checked: **2026-11-07** (App Review Guidelines revision of 2026-10-16; Google Play target API 36; Expo SDK 58).

## What it doesn't do

- Teach React Native, SwiftUI or Kotlin. For Expo, use [Expo's own skills](https://docs.expo.dev/skills/).
- Upload anything or touch your signing keys. It tells you where each credential goes and what to press.
- Guarantee approval.

## Contributing

Rules change several times a year. The most useful contribution is a rule update: change the fact in `docs/sources/` with the official URL, then the skill or check that uses it. `node scripts/validate.mjs` and `npm test` in `cli/` must pass.

Found a rejection the pack missed? Open an issue with the rejection text (remove anything private).

## License

MIT
