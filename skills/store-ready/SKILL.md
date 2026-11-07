---
name: store-ready
description: 'Entry point for getting a mobile app through App Store and Google Play review. Use when the user says "get my app ready for the App Store", "submit my app", "publish to Google Play", "release my Expo app", "is my app ready for review", "what is left before I can submit", "why would Apple reject this", or "prepare for App Store submission". Detects the project type (Expo, bare React Native, native iOS, native Android) and how far along the store work is, runs npx store-ready check, routes to the other store-ready skills in dependency order, and ends with a short status report in store/status.md and the next step.'
license: MIT
---

# store-ready

Use this first whenever the user wants to ship, submit, or understand what stands between their app and the stores. It does not fix things itself; it finds out where the project stands, runs the checker, and sends the work to the right skill in the right order.

Output: `store/status.md`, a status report of about 20 lines (format below), shown to the user as well, and, if the user asked you to get the app ready, the next skill started.

If the user pasted a rejection from App Store Connect or a Google Play policy email, skip everything here and use `rejection-fix`.

## Say this first if Android is in scope

New personal Google Play developer accounts (created after 2023-11-13) must run a closed test with at least 12 testers opted in continuously for at least 14 days before they can apply for production access. Source: https://support.google.com/googleplay/android-developer/answer/14151465

This sets the Android timeline, not the code. Tell the user at the start, before any other work, and ask whether it applies to them. If it does, the closed test should start as soon as there is a working build, and the Data safety form is required before any closed track release (https://support.google.com/googleplay/android-developer/answer/10787469), so `play-data-safety` moves to the front of the queue.

Other facts that change the timeline (organization D-U-N-S numbers, fees, review times, SDK deadlines) are in [references/facts.md](references/facts.md). Mention the ones that apply; skip the rest.

## 1. Detect the project type

Look at the project root (or the app folder in a monorepo):

| Found | Type | Where config changes go |
|---|---|---|
| `app.config.js`/`.ts`, or `app.json` with an `expo` key; `expo` in `package.json`; no `ios/` or `android/` | Expo managed | App config and config plugins |
| Expo config plus `ios/` and `android/` | Expo with native folders | If the folders are in `.gitignore`, they are generated: edit app config. If they are committed, edit the native files and keep app config in step |
| `ios/` and `android/` with `react-native` in `package.json`, no Expo config | Bare React Native | `ios/<App>/Info.plist`, `android/app/src/main/AndroidManifest.xml`, Gradle files |
| `*.xcodeproj` or `*.xcworkspace`, no React Native | Native iOS | Info.plist, target build settings, `PrivacyInfo.xcprivacy` |
| `build.gradle` or `build.gradle.kts` with an Android application module, no React Native | Native Android | `AndroidManifest.xml`, module Gradle file |
| Anything else (Flutter, Capacitor, MAUI, Unity) | Other | The checker reads what it can. Store-side skills still apply. A Capacitor or Cordova app runs in a web view: make sure `app-review-risk` checks it against minimum functionality |

Then work out which stores are in scope: `ios`/`android` sections in Expo config, `platforms`, which native folders exist. If it is still unclear, ask.

Record the bundle identifier, Android package, version and build number. You need them in the report.

## 2. Detect the stage

Check `store/` in the project. The files each skill writes are listed in [references/routing.md](references/routing.md).

- **New**: no `store/` folder. Run the full order.
- **Partial**: some files exist. List which are present and which are missing for the stores in scope.
- **Ready**: every file for the stores in scope exists and the checker reports no errors. Use the fast path.

A clean checker run is not the Ready stage. The checker can print "Passes the checks we know about" before any `store/` file exists; the stage comes from the files, so check them yourself (the checker's `store.files` info lists what it found).

A file that exists can still be stale. If dependencies in `package.json` (or Podfile, Gradle dependencies), permissions, or login/payment code changed after `store/privacy.ios.md` or `store/data-safety.android.md` was last written, treat those two as missing. Use file modification times or the version history to tell.

## 3. Run the checker

From the app's root:

```
npx store-ready check --json
```

Pass a path if the app is not in the current folder: `npx store-ready check apps/mobile --json`.

The command exits with code 1 when there are errors. That is expected; parse the output anyway. Shape:

```json
{
  "version": "0.1.0",
  "project": { "type": "expo", "path": "" },
  "issues": [{ "id": "", "severity": "error|warning|info", "platform": "ios|android|both", "message": "", "fix": "", "source": "", "file": "" }],
  "summary": { "errors": 0, "warnings": 0, "infos": 0 }
}
```

`file` is present only when the issue points at one. Take the counts for the report from the issues you kept (after dropping out-of-scope platforms), not from `summary`, which counts everything. `info` issues are not problems; mention them only when they change the plan (closed testing, `store.files`, URLs "found, not verified").

- Group issues by the skill that fixes them, using the table in [references/routing.md](references/routing.md). Route by the `id` when the table lists it, otherwise by what the `message` is about.
- Drop issues for a platform that is not in scope.
- Keep `fix` and `source` with each issue. The fixing skill needs them.
- If the command fails to run (no network, package not found, Node older than 20), say so in the report, do not invent results, and continue by stage alone. `mock-review` at the end then carries more weight.

The checker is heuristic and local. It cannot see App Store Connect or Play Console, run the app, or log in. A clean run means "passes the checks we know about", nothing more.

It reports URLs it finds (privacy policy, support, deletion page) as "found, not verified": it does not open them unless you pass `--verify-urls`. Run `npx store-ready check --json --verify-urls` once when you have network access. A URL that does not load is a blocking item in the report, routed to the skill that recorded it.

For an `app.config.js`/`.ts` project, or to see what config plugins add to Info.plist, pass the effective config: `npx expo config --type introspect --json` saved to a file outside `store/`, then `npx store-ready check --json --config <file>` (the `ios-privacy` skill shows a shell-safe way to save it).

## 4. Ask once

Ask only what the project cannot tell you, in one message. Skip anything the user's request already answered (stores, account type, dates); restate it in the report so they can correct it.

- Which stores, if not clear from config.
- For Google Play: personal or organization account, and whether a personal account was created after 2023-11-13. Has a closed test already started, and on what date?
- Whether the Apple Developer Program membership and the Play Console account already exist.

Do not ask about anything a later skill will ask about (demo passwords, legal entity name, privacy policy URL). Those skills ask when they need it.

## 5. Route in dependency order

Run skills in this order, skipping any whose output exists, is current, and has no checker issues routed to it. Each step feeds the next: code decisions come before privacy answers, privacy answers before the listing, and the review comes last because it reads everything else.

| # | Skill | Why here |
|---|---|---|
| 1 | `app-review-risk` | Can change what the app is. Cheapest to act on before anything else is written |
| 2 | `login-and-payments` | Sign in with Apple and in-app purchase decisions change code, privacy answers and review notes |
| 3 | `account-deletion` | Code change. Its web deletion URL is an input to the Play Data safety form |
| 4 | `ios-privacy` | Needs the final list of SDKs, login methods and data sharing (including AI providers) |
| 5 | `play-data-safety` | Same inventory as ios-privacy. Required before a closed track release, so move it first for new personal Play accounts |
| 6 | `age-rating` | Needs final features: user content, chat, location sharing, dating |
| 7 | `store-listing` | Describes the features that now exist |
| 8 | `store-screenshots` | Needs final UI and should match what the listing says |
| 9 | `review-notes` | Demo accounts and steps for the features above |
| 10 | `submission-checklist` | Everything outside the code: accounts, signing, builds, export compliance, trader status, testing track |
| 11 | `mock-review` | Reads all of the above as a reviewer would. Fix what it finds, then re-run it |

`rejection-fix` sits outside the order. Use it only after a real rejection.

Run steps for one platform only when the other is out of scope: skip `ios-privacy` for Android-only apps and `play-data-safety` for iOS-only apps. `store-listing`, `store-screenshots`, `age-rating`, `review-notes` and `submission-checklist` cover both stores and take the platform list.

Things that run in parallel with the order, not after it:

- The Play closed test, when the 12-testers rule applies. Start it as soon as there is a working build and the Play Console items that track requires are done. If the user asks whether uploading new builds during the test affects the 14 days, read the page linked above; our sources do not say.
- Account setup that waits on third parties (D-U-N-S, identity verification). Start it on day one.

Small checker errors that belong to no skill (missing bundle identifier, version or build number) can be fixed directly in app config or the native project. Tell the user what you changed.

## 6. Fast path

Use it when all of these hold:

- the checker reports no errors for the stores in scope;
- every `store/` file for those stores exists and is current (step 2);
- `store/review-risks.md` exists with no open High risks.

Then:

1. Fix checker warnings that apply, through their skills.
2. Re-read `store/review-notes.txt` with the user: are the demo accounts still valid, and do the steps match this version's screens? Expired demo logins are a 2.1 rejection.
3. If this is an update, check what changed since the last release (new permissions, SDKs, login methods, paid features). Send each change to its skill only.
4. Run `mock-review`.
5. Run `submission-checklist` for the remaining non-code items and the build and submit steps.

## 7. Report

Write the report to `store/status.md`, replacing the previous one, and show it to the user. It is a snapshot of this run, so the date line matters; the answers for the consoles stay in the other skills' files.

```
store-ready: <App name> <version> (<build>), <project type>, <date>
Stores: iOS, Android
Stage: partial (have: listing, review notes; missing: privacy, data safety, age rating, screenshots, checklist)
Checker: 3 errors, 2 warnings

Timeline
- Play personal account created after 2023-11-13: 14-day closed test with 12 testers before production. Start it now.

Blocking
- [ios] NSCameraUsageDescription is generic -> ios-privacy
- [both] sign-up found, no account deletion -> account-deletion
- [android] targetSdk 34, needs 36 -> play-data-safety
- [both] privacy policy URL returns 404 (opened 2026-11-07) -> user publishes it; ios-privacy, play-data-safety re-check

Warnings
- [ios] Google sign-in without Sign in with Apple -> login-and-payments

Next: account-deletion
Then: ios-privacy, play-data-safety, age-rating, store-screenshots, submission-checklist, mock-review
```

Rules for the report:

- One line per issue: platform, what is wrong in the user's terms, the skill that fixes it.
- Leave out sections with nothing in them.
- "Next" is one skill. "Then" lists the rest of the order that still applies.
- Never write "ready to submit" or "will be approved". The furthest you go is "passes the checks we know about; run mock-review and submission-checklist before submitting".
- If the checker did not run, say "Checker: not run (<reason>)".

If the user asked you to get the app ready (not just for status), start the "Next" skill after the report. If they asked only where things stand, stop after writing `store/status.md`.

## Verify

Before you finish:

- `store/status.md` exists and has today's date.
- The project type and store list in the report match what is on disk.
- Every issue in the report comes from this checker run or from a missing `store/` file. Nothing is from memory.
- The error and warning counts match the JSON issues for the platforms in scope (count `severity` values; `info` is not a warning).
- Every URL in the report was opened (or `--verify-urls` was run) and its result is stated; none is reported as fine on the checker's "found, not verified" alone.
- Every skill named in "Next" and "Then" exists in `skills/`, and the order matches the table in step 5.
- If Android is in scope, the 12-testers, 14-days rule was raised and the user's answer is reflected in Timeline.
- After any routed skill finishes, re-run `npx store-ready check --json` and confirm its issues are gone before moving on.
