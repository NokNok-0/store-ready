# Eval: store-ready on examples/habit-tracker (2026-11-07)

Agent run: Claude Code on Windows 11, Node 22.23.2, Chrome 156 headless. Skills read from `skills/`; checker run as `node cli/bin/store-ready.mjs check examples/habit-tracker`. `BEFORE.md` and `docs/check-before.txt` were not opened.

## Outcome

| | Before | After |
|---|---|---|
| Checker | 4 errors, 7 warnings, 5 info (exit 1) | 0 errors, 0 warnings, 3 info; `--strict` exit 0 |
| `npm test` | 3 suites, 17 tests | 7 suites, 27 tests, all pass |
| `npx tsc --noEmit` | pass | pass |
| `store/` | missing | all 11 files of `routing.md` plus 14 images, check-sizes 0/0 |
| mock-review | n/a | pass 1: 3 Blocking; pass 2: 2 Blocking, 1 Risk |

The 2 Blocking findings left are real and cannot be fixed under this run's rules: the privacy policy and deletion page URLs (`github.com/NokNok-0/store-ready/blob/main/examples/habit-tracker/docs/...`) return 404 until the developer publishes the files. The checker cannot see this; it reports 0/0 anyway.

Code changes the skills drove: bundle ID / package / build numbers; expo-image-picker plugin purpose strings with the microphone key removed; full privacy manifest (4 categories, not the 1 the checker asked for); READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, RECORD_AUDIO, SYSTEM_ALERT_WINDOW blocked; Sign in with Apple (iOS only, mock session, no tokens kept); in-app account deletion (profile, habits, photo files, sign-out, failure keeps the session); in-app privacy policy and support links; Pro paywall stub and 5-habit cap removed; mock "Continue with Google" removed; Expo template icon set replaced with original artwork.

## Per skill

### store-ready (about 10 min)
- Triggered cleanly ("Get Streaks ready for the App Store and Google Play").
- Produced: the status report (in the agent's reply, not a file, as the skill says) and the routing order.
- Friction:
  - The documented JSON shape is wrong. `skills/store-ready/SKILL.md:63`: `"severity": "error|warning"`. Real output also has `"info"`, a `file` key, and top-level `version`, `project`, `summary`. An agent that counts by the documented shape miscounts.
  - Routing for the privacy policy URL is split three ways. `references/routing.md:36` routes "Privacy policy URL not configured" to ios-privacy and play-data-safety, but the checker's own fix says to add `privacyPolicyUrl` to `store/listing.*.json` (a store-listing file), and the checker also accepts app config `extra`, which no skill mentions. I used `extra` plus the listing files; the skills would not have led me to `extra`.
  - "Ask once" assumes a live user. Fine for real use; noting that the request already answered most questions and the skill has no "skip what the request already answered" line.
  - The stage logic says "Ready" means "the checker reports no errors". After my code fixes and before any `store/` file existed, the checker already printed "Passes the checks we know about" (0/0). Only the stage table keeps an agent from stopping there.

### app-review-risk (about 10 min, plus a later fix)
- Triggered as step 1 of the order.
- Produced `## Product risks`: R1 store name "Streaks" may collide with an existing habit app (4.1), R2 crowded category (4.3(b)), and later R0 Expo template icon (High, changed).
- Friction:
  - `SKILL.md:23`: "5. Assets: icon, splash, any image that carries another brand." It says to look at assets but not to open the image files. I read the line, did not view the PNGs, and missed that every icon asset was the Expo template chevron. I found it 40 minutes later while rendering the feature graphic. The checker reported only "has an alpha channel" for that icon. Make "open every icon and splash image" an explicit step with a "template or default artwork" signal.
  - A5 copycat signals only look for other brands inside this app's name. Nothing says to search the stores for the same name. "Streaks" is very likely taken by a well-known habit tracker; the pack leaves it to store-listing's "checking the name is free to use (trademarks) is theirs to do" (`store-listing/SKILL.md:47`).
  - There is no area for fake or mock integrations (a "Continue with Google" button that never calls Google). It took mock-review's `example.com` string check to catch it.

### login-and-payments (about 15 min, plus 10 min after mock-review)
- Triggered by the checker's `login.apple-equivalent` warning.
- Produced `## Login and payments` (L1 Sign in with Apple, L2 paywall stub removed, L3 no Play payments) and the code.
- Friction:
  - Is a secondary Google button "primary"? `references/apple-rules.md:16`: "The rule is triggered by a third-party or social login being the primary account". Here email/password led and Google was second. The checker warns either way. I applied 4.8 on the reading that the Google login created the user's primary account; the skill should say so.
  - The snippet asks for `FULL_NAME` and `EMAIL` unconditionally. The app has no name field, so I asked for `EMAIL` only. Add "request only the scopes you store".
  - Nothing covers mock or demo auth. The skill tells you to "pass the credential to the auth provider using its documented Sign in with Apple method"; with a local mock there is no provider. I mapped `credential.user` to a local profile, per the request.
  - The disabled "Subscribe" stub was in scope here only through "Review readiness for paid features". I removed the paywall and the cap because nothing could be bought or reviewed. That is a product decision the skill does not tell you how to escalate. Flagged to the developer.
  - The removed Google button (found by mock-review) should have been caught here. The skill inventories "login methods" from package names and SDK calls, so a hand-rolled fake `signInWithGoogle` looks like a real one.

### account-deletion (about 25 min, including tests)
- Triggered by the `account.deletion` warning.
- Produced `src/account.ts`, `src/app/delete-account.tsx`, the Settings row, the sign-in notice, `docs/delete-account.md`, and 7 deletion tests (unit and screen: confirm, cancel, failure keeps you signed in, no restore on re-sign-in, Apple re-sign-in starts fresh, other users' data untouched).
- Friction:
  - The skill assumes a server. `SKILL.md:60`: "If the project has no server, add a minimal function on the provider's platform or the project's existing hosting". For local-only accounts there is nothing to deploy, and deploying would contradict the request. There is no local-only branch.
  - Missing fact: Google's page (read during this run) says "accounts that are created and operated offline are not app accounts and do not fall within policy scope." `references/store-rules.md` does not record it, and it changes what the web page must do for local-only apps.
  - Contradiction with the user. `references/web-deletion-page.md:40`: "Do not use a document-sharing link or a form on a third-party domain unless the user insists". The developer chose GitHub for the privacy policy; I put the deletion page next to it and recorded it as a `user` item to confirm.
  - Sign in with Apple revocation has no "no token was ever exchanged" case. Same gap in mock-review (below).
  - `references/implementation.md:78` has app-specific copy in the generic snippet: "Your account, habits and photos will be permanently deleted." It reads as if the snippet was written for this sample app.
  - Nothing tells the agent to check that the URL it records loads. The deletion URL went into `data-safety.android.md` as a 404.

### ios-privacy (about 15 min)
- Triggered by the purpose-string errors and the privacy-manifest warning.
- Produced the app.json changes and `store/privacy.ios.md`.
- Friction:
  - Windows. `SKILL.md:44`: "In Expo, run `npx expo prebuild --platform ios --no-install`". On Windows, Expo prints "Skipping generating the iOS native project files" and exits with "CommandError: At least one platform must be enabled". The working fallback (`npx expo config --type introspect`) is only in `references/purpose-strings.md`. Put it in SKILL.md with the Windows case named.
  - Side effect not mentioned: `npx expo prebuild` (Android, run for play-data-safety) rewrote `package.json` scripts (`"android": "expo run:android"`, `"ios": "expo run:ios"`). The skills say to delete `android/` afterwards but not to restore `package.json`. I restored it by hand.
  - The expo-image-picker plugin was not in `plugins` at all, so purpose strings could not be set "through the plugin's option" without first adding the plugin. Worth a line: "if the package has a config plugin and it is not listed, add it".
  - App Privacy rules are good. Apple's "processed only on device is not collected" sentence had to be fetched; it decides the whole answer for local-first apps, so copy it into `apple-facts.md`.

### play-data-safety (about 15 min)
- Triggered by the READ_MEDIA_IMAGES warning; moved early because the account is a new personal one.
- Produced `store/data-safety.android.md` and the blockedPermissions changes.
- Friction:
  - `list-permissions.mjs` drops `maxSdkVersion`, so READ/WRITE_EXTERNAL_STORAGE (maxSdkVersion 32) look like full storage permissions.
  - The prebuild showed `SYSTEM_ALERT_WINDOW` in the main manifest (Expo template). Neither the script nor `permissions.md` says what to do with it; I blocked it.
  - The template has "Account creation" and "Delete account URL" overview lines; the Google help article I read does not list those questions. Possibly fine (Console asks them), but unverifiable from the pack's sources.
  - Same URL-not-verified gap.

### age-rating (about 5 min)
- Clean. 12 topics are easy to walk for a simple app. No friction worth listing. Minor: the Apple table asks for "Social-media capabilities" without listing them, so the answer is "None apply" with no way to check against the real list.

### store-listing (about 8 min)
- Produced both listing JSONs; `measure.mjs` 0 errors, 3 warnings.
- Friction:
  - Tool contradicts the guide. `measure.mjs` warns "superlative or ranking claim: 'best'" on "best streak", while `references/writing-guide.md:8` says "Name things the way the UI names them." The UI's stat tile is labelled "Best". I kept it and justified it. The script needs a way to accept UI labels.
  - The checker does not apply the same word checks: a probe name "Streaks - Best Free Habit App" passed the checker with no warning (only measure.mjs would catch it).

### store-screenshots (about 35 min, including the icon redesign)
- Produced `plan.md`, 4 iPhone (1206x2622), 4 iPad 13-inch (2064x2752), 4 Play phone (1080x2160), feature graphic, 512 icon; check-sizes `--ipad` 0/0.
- Helped: it required the iPad set because `supportsTablet` is true, which the request did not mention. The viewport table was exact and right.
- Friction:
  - The headless CLI example (`references/capture.md:50`) cannot seed state or sign in, and this app is behind sign-in. The skill's answer, "add a temporary route or query flag for capture" (`capture.md:47`), means editing app code. I used the DevTools protocol (Node 22's built-in WebSocket) to set the viewport and scale, seed localStorage, and tap through. Ship that as a script; it is about 60 lines.
  - Web header differences are not in the list. `capture.md:44` lists "tab bar and header blur" but not that react-navigation on web draws a Material back arrow. Tapping through gives Android-style arrows in iOS screenshots (a 2.3.10 risk); opening routes by URL gives no back button. I used URL navigation for iOS and taps for Android.
  - No guidance for an iPad set of a phone-width layout (content capped at 640 px looks sparse at 2064x2752).
  - Feature graphic step is where the template icon surfaced. It belonged in app-review-risk.

### review-notes (about 6 min)
- Produced `review-notes.txt` (2,218 bytes, ASCII) and `app-access.android.txt`.
- Friction:
  - The template assumes a server. `assets/review-notes-template.txt:5`: "All accounts below work against the production server this build uses and do not expire." For local accounts the demo account must be created on the reviewer's device.
  - The developer's "any 8+ char password works" was incomplete: `signIn` throws "No account found" on a fresh install until "Create an account" is used. I caught it by reading `src/auth.ts`; the skill's "Sign-in" inventory step points the right way but does not say to trace a fresh-install login.

### submission-checklist (about 10 min)
- Produced `store/checklist.md` with the closed test first and an earliest production date.
- Friction:
  - DSA trader status: `references/apple.md` records only that it must be declared and what traders publish. Apple's page has the factors that decide it (monetization, commercial practices, VAT, connection to a trade) and the hobbyist example. I fetched it to write a suggestion for the user to confirm. Copy those factors in.
  - Export compliance: correctly left as `user`. No friction.

### mock-review (about 20 min across two passes)
- Produced the `## Mock review 2026-11-07` section. Pass 1: 2.1 mock Google sign-in with `google.user@example.com` (Blocking), privacy policy URL 404 (Blocking), deletion URL 404 on Play (Blocking), Sign in with Apple revocation (Risk). Pass 2 after fixes: 2 Blocking (the URLs), 1 Risk.
- This was the most valuable skill in the run. It found two real problems everything before it missed.
- Friction:
  - Sign in with Apple revocation. `references/checks.md:140` makes "Sign in with Apple is used and deletion does not revoke tokens" Blocking, with no case for an app that never exchanges the authorization code and has no server. I marked it Risk and explained; a literal agent would block an app that cannot comply without a backend.
  - No owner for 2.1 findings. `SKILL.md:13`: "fixes go through the skill that owns them", but the owner list in step 6 has no skill for placeholder content, fake integrations or broken links. I routed the Google fix to login-and-payments by judgment; publishing the URLs has no skill.
  - Same-day history is lost. `SKILL.md:100`: "If a section with today's date exists, replace it". Pass 1 and pass 2 on the same day means pass 1 is overwritten. I kept a one-line summary of pass 1 in pass 2's header. Use `## Mock review 2026-11-07 (2)` instead.
  - It was the only place URLs got opened ("If you can open the URL, check it loads"). Every earlier skill accepted a URL string.

## Checker accuracy

False negatives (each confirmed by running the checker):
1. Privacy policy URL that returns 404 counts as configured (a URL string in `extra`, listing or source is enough). Offline by design, but then it should say "URL found, not verified".
2. App icon was the Expo template artwork; reported only as "has an alpha channel" (info).
3. Privacy manifest: warned about 1 category (UserDefaults); scan-deps showed 4 missing (FileTimestamp, SystemBootTime, UserDefaults, DiskSpace).
4. Probe: with `microphonePermission` removed, expo-image-picker's plugin adds the default "Allow $(PRODUCT_NAME) to access your microphone". Checker: 0/0.
5. Probe: with `src/app/delete-account.tsx` and the Settings row removed but `deleteAccount` still in `src/session.tsx`, `account.deletion` stays quiet. It matches strings, not reachable UI.
6. Probe: with `store/` moved away entirely, the checker gives 0 errors, 0 warnings and "Passes the checks we know about".
7. Probe: listing name "Streaks - Best Free Habit App" (price word plus superlative) is not flagged; only the 106-byte keywords were.
8. A disabled "Subscribe" button with "Subscriptions are not available yet." and a fake Google login with `google.user@example.com` were not flagged. Possibly out of scope for a static checker, but `example.com` in source is cheap to find.

Wrong facts in checker output:
- `ios.privacy-manifest`: "@react-native-async-storage/async-storage is a dependency, and no UserDefaults reason is declared". Async-storage's own `PrivacyInfo.xcprivacy` declares FileTimestamp C617.1, not UserDefaults.
- `account.deletion` message labels the local mock as "auth.signUp (Supabase and others) in src/session.tsx".

Near false positive:
- `app.icon` alpha info on an Expo project. Expo's iOS icon generation flattens transparency, so the note does not apply to Expo managed apps. It is info only, but it was the only icon signal and it pointed at the wrong problem.

Routing: no issue was routed to the wrong skill, apart from the privacy-policy split noted under store-ready.

## Top 10 improvements, ranked

1. **Verify URLs, everywhere they are recorded.** ios-privacy, play-data-safety, account-deletion and submission-checklist must open the privacy policy, support and deletion URLs and record the HTTP status; the checker should say "URL found, not verified" instead of passing. In this run a 404 survived until the last skill.
2. **Detect template and fake content early.** Add an app-review-risk area (and a cheap checker rule: hash of Expo's template icons, `example.com`, "not available yet", "coming soon") for default artwork, placeholder accounts, disabled purchase buttons and social buttons that never call the provider. Give it an owner so mock-review can route its 2.1 findings.
3. **Local-only / no-backend branch for account deletion and Sign in with Apple.** Record Google's "offline accounts are out of scope" sentence; say what the web page should say when there is no server; add the "no token was ever exchanged" case to both account-deletion and `mock-review/references/checks.md:140`.
4. **Make the privacy-manifest check match scan-deps.** Report every missing category from package manifests and fix the async-storage attribution. Today the checker's answer is wrong in kind and in count.
5. **Read plugin defaults in the checker.** Use `npx expo config --type introspect` output (or `--config`) so default purpose strings such as NSMicrophoneUsageDescription are caught.
6. **Make the deletion heuristic look for a reachable entry**: a route or a user-visible "Delete account" string, not an identifier anywhere in `src/`.
7. **Ship a capture script for signed-in apps.** A DevTools-protocol script that sets viewport and scale, seeds storage, taps through and flattens to RGB; document the iOS web back-arrow problem. The current CLI example cannot reach any screen behind sign-in.
8. **Windows and prebuild hygiene in ios-privacy and play-data-safety.** State that iOS prebuild is skipped on Windows and go straight to introspect; warn that prebuild rewrites `package.json` scripts and must be reverted with the native folders.
9. **review-notes template for device-local accounts.** Drop "production server" when there is none, and require tracing a fresh-install sign-in so "create the account first" ends up in the notes.
10. **Align the word checks and fix the docs.** measure.mjs needs an allow-list for UI labels ("best streak"); the checker should apply the same price and superlative words to `name`/`title`; fix the JSON shape in `store-ready/SKILL.md:63`; let mock-review keep same-day passes; add the DSA trader factors and Apple's "processed only on device" sentence to the references.

## Process notes

- Total time about 3 hours, of which reading the pack was about 30 minutes.
- I ran `git status` once by mistake while checking the install (read-only); no other git command.
- Pages fetched (public, no login): Apple App Privacy details, Apple DSA trader requirements, Google Play account deletion (13327111), Google Play Data safety (10787469), and the privacy policy URL (404).
- Temporary `android/` from prebuild was deleted; `package.json` scripts restored.
