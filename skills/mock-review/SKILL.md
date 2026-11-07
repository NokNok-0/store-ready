---
name: mock-review
description: 'Runs a strict mock App Store review and Google Play review of the project and its store/ files before you submit, and writes the findings in the stores own format ("Guideline 2.1 - Performance - App Completeness", what was found, next steps) to store/review-risks.md. Use when the user says "review my app like Apple would", "mock review", "act as App Review", "pre-submission review", "will my app pass review", "check everything before I submit my app", or "what would Google Play reject". Checks the demo account in review notes, screenshots (more than half show the app in use), metadata accuracy against real features, privacy policy links, purpose strings, account deletion, login services (4.8), in-app purchase (3.1.1), hidden features (2.5.19), creative assets (2.3.14) and Play Data safety, permissions and target API. Read-only on code; says plainly what it cannot verify.'
license: MIT
---

# mock-review

Use this as the last step before submitting, after the other store-ready skills have run, and again after fixing what it found. It plays a strict Apple App Review and Google Play reviewer against what is on disk.

Output: a dated `## Mock review` section appended to `store/review-risks.md`. Findings use the stores' format: a guideline header, what was found, next steps, the source. Nothing else changes.

You are read-only on code and config. Do not edit app source, app config, native files or other `store/` files, even to fix something trivial. The point is an independent review; fixes go through the skill that owns them.

Checks and their rules are in [references/checks.md](references/checks.md). The output format, headers and an example finding are in [references/format.md](references/format.md). Read both before starting. They are the only source of store rules for this review.

## How a strict reviewer works

- They try to use the app as described in the listing and notes, and report the first thing that stops them.
- They check that every claim in the metadata is true of the build.
- They cite one guideline per issue and say what to do next.
- They do not know or care how hard the fix is.

Two differences from the real thing, both deliberate:

- You cannot run the build. Anything that needs a running app, a network call, a login or a console screen is "Not verified", never a finding. Do not guess that something crashes or that a backend is down.
- You cite the source URL for every finding, so the user can check the rule themselves.

## 1. Gather

Read, in this order, and note what is missing:

1. App config (`app.json`, `app.config.*`) or `Info.plist` and `AndroidManifest.xml`; version and build numbers; `supportsTablet` or device family; declared permissions and purpose strings.
2. `package.json`, Podfile, Gradle dependencies: auth providers, payment and IAP libraries, analytics and ads SDKs, AI SDKs, feature flag and OTA libraries.
3. Navigation and screens: what the user can reach, what is behind sign-in, which roles exist.
4. Everything in `store/`: `listing.ios.json`, `listing.android.json`, `review-notes.txt`, `privacy.ios.md`, `data-safety.android.md`, `age-rating.md`, `screenshots/`, `checklist.md`, and earlier sections of `review-risks.md`.
5. Server code if it is in the repository (deletion endpoint, token revocation).

Then run the checker:

```
npx store-ready check --json
```

It exits with code 1 when it finds errors; parse the output anyway. Treat each `error` as a confirmed finding: write it in the store format with its `source`. Treat each `warning` as a lead to check by hand. If the checker cannot run, say so in the section header and do every check by hand.

## 2. Check

Work through every check in [references/checks.md](references/checks.md) for the stores in scope. These are mandatory, in this order, because a reviewer meets them in this order:

1. 2.1 demo account and reviewer access. If the reviewer cannot sign in, nothing else gets reviewed.
2. 2.1 static completeness: placeholder text, dev URLs.
3. 5.1.1(v) account deletion, and Play account deletion.
4. 4.8 login services.
5. 3.1.1 in-app purchase.
6. 5.1.1(ii) purpose strings.
7. 5.1.1(i) privacy policy in the app and in the metadata.
8. 5.1.2(i) data sharing and forced permissions.
9. 2.5.19 hidden features.
10. 2.3, 2.3.7, 2.3.10 metadata accuracy, feature by feature.
11. 2.3.3 screenshots, more than half in use per size.
12. 2.3.14 creative assets.
13. 1.2 and 1.5, App Privacy and age rating consistency.
14. Play: Data safety, permissions, target API, minimum functionality, listing, content rating, reviewer access.

For each check, decide one of: finding (Blocking or Risk), not verified, or passed. Record passed checks too; they go in one line each in the Result, so the user can see coverage.

How to judge:

- Blocking needs evidence in the files and a rule in the checks file that the evidence breaks. Both, or it is not Blocking.
- If the rule depends on something you cannot see (a console setting, whether the server deletes data), it is Not verified, with what the user should check.
- If the checks file says to read an official page first, read it. If you cannot open it, mark the check Not verified and give the URL.
- If you spot something no check covers, add it under "Not verified" with the official page to read. Do not cite a guideline number from memory.
- A purpose string, listing line or review note that technically exists but is generic counts against the rule. Reviewers reject vague text.

## 3. Metadata accuracy, done properly

Do it line by line; skimming the description misses claims:

1. Split the description, subtitle, promotional text and What's New of `store/listing.ios.json` into individual claims. Do the same for `store/listing.android.json`.
2. For each claim, find the screen or code that delivers it. Write the path next to the claim in your notes.
3. Any claim with no path is a 2.3 finding. Any claim that only works for a paid or special role, unstated, is a Risk.
4. For every feature in What's New, check the review notes describe how to reach it.

## 4. Screenshots, done properly

For each device size under `store/screenshots/` (iOS images are grouped by display class from their pixel size; folders are `ios/iphone`, `ios/ipad`, `android/phone`, `android/tablet`):

1. Check pixel sizes and format against the required sizes in the checks file.
2. Open every image. Classify each as "in use" (a real screen with real content) or "not in use" (splash, login, title art, marketing slide).
3. Count. More than half must be "in use" for each size. Write the count in the finding, for example "2 of 5 show the app in use".
4. Compare the screens shown with the current UI in code.

If you cannot view images, mark the count Not verified and list the files.

## 5. Write the section

Append to `store/review-risks.md` (create the file with a `# Review risks` title if missing):

- Heading `## Mock review <YYYY-MM-DD>`. If a section with today's date exists, replace it; keep earlier dates as history.
- Header lines: build, stores, what was read, checker result.
- `### Apple` findings, then `### Google Play` findings, each in the format from [references/format.md](references/format.md). Leave out a store that is not in scope.
- `### Not verified`: always present. Runtime behaviour is always on it.
- `### Result`: counts of Blocking, Risk and Not verified; the one fix to do first and why; one line listing checks that passed.

Do not touch the `## Product risks` section or earlier mock reviews.

## 6. Tell the user

Three to six lines: the Blocking count, the first fix and which skill makes it (`review-notes`, `account-deletion`, `login-and-payments`, `ios-privacy`, `play-data-safety`, `store-listing`, `store-screenshots`, `age-rating`), and the device tests from "Not verified". If there are no Blocking findings, say "passes the checks we know about" and point to the Not verified list. Never say the app will be approved.

## Verify

- Only `store/review-risks.md` changed. Compare the project against its state before the review (version control status, or file modification times) and confirm no code, config or other `store/` file was edited.
- The new section has today's date, and earlier sections are unchanged.
- Every check in step 2 for the stores in scope appears as a finding, a Not verified line, or in the passed list.
- Every finding has a header from the format file, Status, Found with at least one path, Next steps, and a Source URL that appears in [references/checks.md](references/checks.md).
- Every checker error from this run appears as a finding.
- Nothing in Found describes runtime behaviour you did not observe.
- Byte counts you report (review notes, keywords) were counted, not estimated.
