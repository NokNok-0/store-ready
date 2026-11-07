---
name: submission-checklist
description: Builds a status-per-item checklist of everything outside the code that both stores require before a first release or update - Apple Developer Program, Xcode 26 SDK build requirement, export compliance, EU DSA trader status, medical device declaration, App Privacy, age rating, screenshots, privacy policy and support URL, TestFlight beta review; Google Play $25 account, identity verification and D-U-N-S, the closed testing 12 testers for 14 days rule for new personal accounts, target API 36, AAB, Play App Signing, Data safety, content rating, app access, listing assets - plus the EAS build and eas submit path for both platforms. Use when the user asks "what do I need to submit", "how do I publish my app", "submit to TestFlight", "submit to the App Store", "publish to Google Play", Play Console setup, closed testing 12 testers, "production access", eas submit, or wants a release checklist. Produces store/checklist.md.
license: MIT
---

# submission-checklist

Use this skill when the user is getting ready for a first store release, starting a new store account, or preparing an update and wants to know what is left.

It produces `store/checklist.md` in the user's project: every requirement outside the code for both stores and the EAS path, each with a status, the evidence for it, the next step, and its source. It ends with the next three actions.

Facts and sources are in:

- [references/google-play.md](references/google-play.md): account, closed test, build, declarations, listing.
- [references/apple.md](references/apple.md): account, build, compliance, metadata, TestFlight.
- [references/eas.md](references/eas.md): `eas build`, `eas submit`, profiles, credentials, free plan limits.

The template is [assets/checklist-template.md](assets/checklist-template.md).

For EAS depth beyond what is here (workflows, environment variables, custom builds, updates), use Expo's own skills: https://docs.expo.dev/skills/.

## 1. Check the long-lead items first

Two items take weeks no matter how fast the rest goes. Settle them before anything else and put them at the top of the checklist.

**Google Play closed test.** Personal developer accounts created after 2023-11-13 must run a closed test with at least 12 testers opted in continuously for at least 14 days before they can apply for production access. This is the item that most often surprises people: the app can be finished and still be at least two weeks from production. If it applies:

- Compute the earliest date production access can be requested: the day the 12th tester opts in, plus 14 days.
- Plan the first Android build for as soon as the app is usable, so the clock starts early. Fixes during the 14 days go to the same closed track.
- Tell the user to line up more than 12 testers, because the requirement is about testers staying opted in for the whole period. Read https://support.google.com/googleplay/android-developer/answer/14151465 for what counts.

**D-U-N-S number.** Organization accounts on Play need one, and it can take 30+ days. If the user publishes as a company and has no D-U-N-S number, that is the first action.

## 2. Read what the project already shows

Mark items `done` or `todo` from evidence in the project. Do not ask the user what you can read.

| Item | Where to look |
|---|---|
| Bundle ID, package name | `ios.bundleIdentifier`, `android.package` in app config; Xcode target; `applicationId` in Gradle |
| Version, build number, versionCode | app config, `Info.plist`, Gradle, and whether EAS manages them (see `eas.json`) |
| iPad support | `ios.supportsTablet`; device family in the Xcode target |
| Target API | `android.targetSdkVersion` via `expo-build-properties`, or Gradle. Expo SDK 58 defaults to 36 |
| AAB | production profile in `eas.json` (not `buildType: "apk"`) |
| Export compliance key | `ios.config.usesNonExemptEncryption` or `ios.infoPlist.ITSAppUsesNonExemptEncryption` in app config; `Info.plist` |
| Privacy policy URL | app config, the in-app settings or about screen, the listing files |
| Support URL and contact | the in-app help or about screen |
| Account deletion | the account-deletion skill's output, or a delete-account flow in the code |
| Listing, screenshots, notes, privacy, data safety, age rating | the files in `store/` written by the other skills |
| EAS profiles and submit config | `eas.json` |
| Secrets in git | service account JSON, `.p8` keys, keystores, `credentials.json` tracked by git |

If `npx store-ready check` is available, run it and use its results for the items it covers. Run it with `--verify-urls` when you have network access; without the flag it lists URLs as "found, not verified", which is not evidence.

### URLs: open them

A privacy policy, support or deletion URL is `done` only after you opened it today and it loaded. Open each one in a browser or with `node -e "fetch(process.argv[1]).then(r=>console.log(r.status,r.url),e=>console.log('failed',e.message))" <url>` and put the result in the Evidence column: `https://example.org/privacy, opened 2026-11-07: HTTP 200, names the app`. A URL that returns 4xx or 5xx, fails to resolve, needs a login, or shows a page for something else is `user` (the user publishes the page) and goes in "Start first", because the store consoles need a working page before review. If you cannot make network requests at all, mark it `todo` with "not opened", never `done`.

A tracked service account key, App Store Connect API key or keystore is a `todo` at the top of the file: remove it from git, rotate it, and ignore it.

## 3. Ask the user once

Ask, in one message, only for what lives in their accounts:

- Apple: enrolled in the Apple Developer Program? Individual or organization?
- Google Play: account created? Personal or organization? When was it created (before or after 2023-11-13)? Identity verification done? D-U-N-S number (organizations)?
- Closed test: started? Start date and number of opted-in testers?
- EU DSA trader status: are they a trader? Our sources say the declaration is required even if they do not distribute in the EU, but do not record how Apple decides who is a trader. Before you ask, open https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements, read the factors and examples it gives, and quote them to the user with the URL. Suggest an answer only from what that page says; the user decides and declares it.
- Is the app a health or medical app (regulated medical device declaration for the EU, UK and US)?
- Is the app in a regulated field (banking, health, gambling, crypto, air travel)? If so, it must be published by the legal entity.
- Export compliance: does the app use encryption beyond standard OS networking? If unsure, point them to https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance; do not answer this for them.
- Which EAS plan they are on and how many builds they have used this month.

Mark what they cannot answer yet as `user`, with the exact console step.

## 4. Write `store/checklist.md`

Copy [assets/checklist-template.md](assets/checklist-template.md) and fill every row. Statuses:

- `done`: with evidence (file and value, or the user's answer and date).
- `todo`: something you or the user can do in the project; say what.
- `user`: only the user can do it, in a console or account; give the console and the step.
- `n/a`: with the reason ("organization account", "no accounts in the app", "not a health app").

Rules:

- Keep the "Start first" section at the top, and put the closed test first when it applies, with the earliest production-access date.
- For each item another store-ready skill produces (listing, screenshots, review notes, App Privacy, Data safety, age rating, account deletion), point to its output file, or name the skill to run if the file is missing.
- Remove rows for a store the user is not shipping to, and say so in the header.
- Do not mark anything `done` without evidence. "Probably configured" is `todo`.
- Do not state rules that are not in the references. If the user asks about something not covered, give the official page and say it was not in store-ready's checked sources.

## 5. The EAS path

If the project uses Expo, fill the "Build and submit (EAS)" section from [references/eas.md](references/eas.md). The order:

1. `npm i -g eas-cli`, `eas login`, `eas build:configure`.
2. Confirm `eas.json` has development, preview and production profiles, and how build numbers increment.
3. `eas build -p all --profile production` (cloud builds work from Windows; `eas build --local` does not).
4. Android: create the app in Play Console, give EAS a Google service account key, then `eas submit -p android`. The first upload goes to the internal track. Use `releaseStatus: "draft"` so nothing rolls out by accident. Read https://docs.expo.dev/submit/android/ for whether the first upload of a new app must be made by hand.
5. iOS: `eas submit -p ios`. It creates the App Store Connect app if missing. CI needs an App Store Connect API key from an Account Holder or Admin. The build appears in TestFlight; external testers need Beta App Review for the first build of each version.
6. New personal Play account: move the build to a closed testing release, add 12+ testers, start the 14 days.
7. When everything in the checklist is `done` or `n/a`: submit for review in each console.

Every upload needs a new build number or versionCode. On the free plan, the user has up to 15 Android and 15 iOS builds a month with a 45-minute timeout; say how many builds this plan uses.

If the project is not Expo, write the build steps as "build a signed AAB / archive and upload with the platform tools" and link the platform pages in the references; do not invent fastlane or Gradle commands the project does not already use.

## 6. Report

Tell the user:

- The next three actions, in order, and who does each.
- The earliest realistic production date on Play if the closed test applies.
- Any dates in the references that fall within the next month (for example Apple's new age-rating descriptors on submissions from 2026-11-16).
- That the checklist covers the requirements store-ready knows about; it does not guarantee approval.

## Verify

- [ ] `store/checklist.md` exists, and every row has a status from the four allowed values.
- [ ] Every `done` row has evidence; every `todo` and `user` row has a concrete next step.
- [ ] Every URL row (privacy policy, support, account deletion web link) shows the date you opened it and the HTTP status. No URL that failed to load is `done`.
- [ ] If the user has a personal Play account created after 2023-11-13, the closed test is the first row, with an earliest production-access date.
- [ ] The EU DSA trader status row is present even if the user does not distribute in the EU.
- [ ] No secret (service account key, API key, keystore) is tracked by git, or it is the top `todo`.
- [ ] Every row's source is a URL from the references or another skill's output file.
- [ ] If `npx store-ready check` is available, it was run and its errors appear as `todo` rows.
