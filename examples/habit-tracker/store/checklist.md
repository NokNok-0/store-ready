# Submission checklist

Prepared 2026-11-07 for Streaks 1.0.0 (build 1 / versionCode 1). Stores: App Store, Google Play.
Statuses: `done` (evidence given), `todo` (we can do it in the project), `user` (only the user can do it, in a console or account), `n/a` (does not apply, reason given).

Account facts from the developer (2026-11-07): individual developer; personal Google Play account created in 2026; distributes worldwide including the EU; no ads, no tracking; Pro subscription not in this version. Apple Developer Program membership and closed-test status were not stated.

## Start first

| # | Item | Status | Evidence or next step | Source |
|---|---|---|---|---|
| 1 | Play closed test: 12+ testers opted in for 14+ consecutive days (personal accounts created after 2023-11-13) | user | Applies: personal account created in 2026. Not started. Earliest production access: the day the 12th tester opts in + 14 days; if that is today, 2026-11-21. Recruit 15-20 testers so 12 stay opted in. Build the first AAB now (E6), upload it to internal testing (E7), then create the closed testing release in Play Console > Testing > Closed testing and add the testers | https://support.google.com/googleplay/android-developer/answer/14151465 |
| 2 | D-U-N-S number (Play organization accounts; can take 30+ days) | n/a | Personal account | https://support.google.com/googleplay/android-developer/answer/13628312 |
| 3 | Play identity verification | user | Play Console > Account details: legal name and address from the Google Payments profile; a government ID may be requested | https://support.google.com/googleplay/android-developer/answer/10841920 |
| 4 | Apple Developer Program membership ($99/year) | user | Not stated. Enrol as an individual at developer.apple.com if not done; needed before any store build | https://docs.expo.dev/build/setup/ |
| 5 | EU DSA trader status declared in App Store Connect (required even outside the EU) | user | Suggested answer for 1.0: not a trader. Basis: individual, the app is free, no ads, no in-app purchases, no stated business activity (Apple's factors: monetization, commercial practices, VAT registration, connection to a trade or profession). Declaring non-trader means EU users are told EU consumer-protection rights do not apply to contracts with you. Revisit before Pro ships: selling a subscription is monetization, and traders must publish a verified address, phone number and email on EU product pages. Confirm in App Store Connect > Business > Digital Services Act; this is your legal assessment, not ours | https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements |

## Apple App Store

| # | Item | Status | Evidence or next step | Source |
|---|---|---|---|---|
| A1 | Bundle identifier set | done | `app.json` `ios.bundleIdentifier`: `dev.storeready.streaks` | app config |
| A2 | Version and a new build number for this upload | done | `app.json` `version` 1.0.0, `ios.buildNumber` "1". Raise it for every upload, or let EAS manage it (E5) | https://docs.expo.dev/submit/introduction/ |
| A3 | Built with Xcode 26+ and the 26 SDKs; deployment target iOS 13+ | todo | Expo SDK 58 supports iOS 16.4+ and needs Xcode 26.4+. Check the EAS build image's Xcode on https://docs.expo.dev/build-reference/infrastructure/ before E6 | https://developer.apple.com/news/upcoming-requirements/ |
| A4 | Export compliance: `ITSAppUsesNonExemptEncryption` set to the user's answer | user | Not set. The app makes no network requests and has no encryption code of its own. Read the export compliance page and answer; if your answer is "no non-exempt encryption", set `ios.config.usesNonExemptEncryption: false` in `app.json` so the question is skipped on each upload | https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance |
| A5 | Regulated medical device declaration, yes or no (EU/EEA, UK, US; category Health & Fitness or Medical, or "Frequent" Medical or Treatment Information) | user | Needed only if the user picks Health & Fitness as a category. Then declare No: no medical or health-record features (`store/review-risks.md`, Checked) | https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status |
| A6 | Regulated field or sensitive data (5.1.1(ix)): Apple says it should be submitted by the legal entity providing the service | n/a | Not a regulated field | https://developer.apple.com/app-store/review/guidelines/ |
| A7 | App Privacy details, including SDK data | user | Answers ready: `store/privacy.ios.md` (Data collected: No). Paste into App Store Connect > App Privacy | https://developer.apple.com/app-store/app-privacy-details/ |
| A8 | Privacy manifest reasons for required-reason APIs | done | `app.json` `ios.privacyManifests` covers UserDefaults, FileTimestamp, SystemBootTime, DiskSpace; scan-deps `missingDeclarations` empty | https://developer.apple.com/support/third-party-SDK-requirements/ |
| A9 | Age rating, including social-media questions and the Shared Location and Dating & Relationships descriptors | user | Answers ready: `store/age-rating.md` (estimate 4+; both new descriptors "No"). The descriptors are required on submissions from 2026-11-16 | https://developer.apple.com/news/?id=yxkh08us |
| A10 | Screenshots: at least one "iPhone with Dynamic Island (medium display)" (1179x2556 or 1206x2622); "iPad 13-inch display" (2064x2752 or 2048x2732) if the app runs on iPad | todo | 4 + 4 in `store/screenshots/ios/`, check-sizes passes. Captured from the web build: compare with a native build before upload (`store/screenshots/plan.md`) | https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications |
| A11 | Listing text within limits | done | `store/listing.ios.json`; measure.mjs 0 errors | https://developer.apple.com/help/app-store-connect/reference/app-information/app-information |
| A12 | Privacy policy URL in App Store Connect and inside the app (5.1.1(i)) | user | In the app: Settings > Privacy policy (`src/app/settings.tsx`). Policy written at `docs/privacy-policy.md`; it is live only once pushed to the public repo at https://github.com/NokNok-0/store-ready/blob/main/examples/habit-tracker/docs/privacy-policy.md. Then enter the URL in App Store Connect > App Privacy | https://developer.apple.com/app-store/review/guidelines/ |
| A13 | Support URL works; contact info accurate (1.5) | user | Support URL https://github.com/NokNok-0/store-ready/issues, linked in Settings > Help and support. Enter it in App Store Connect; check the repository's issues are open to the public | https://developer.apple.com/app-store/review/guidelines/ |
| A14 | Review notes with a demo account for every role (4,000 bytes) | user | `store/review-notes.txt`, 2,218 bytes, ASCII. Contact details go in App Store Connect > App Review Information. The demo account must be created on the review device ("Create an account"); sign-in alone fails on a fresh install | https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review |
| A15 | In-app account deletion, if the app has accounts | done | Settings > Delete account (`src/app/delete-account.tsx`, `src/account.ts`), tested in `src/__tests__/account.test.ts` and `delete-account-screen.test.tsx` | https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion |
| A16 | App icon 1024x1024 | done | `assets/images/icon.png` 1024x1024 RGB, original artwork (replaced the Expo template icon) | Human Interface Guidelines, App icons |
| A17 | Tested on iPad, even if `supportsTablet` is false | user | `supportsTablet: true`. Layouts cap content at 640 px wide (web capture at iPad size looks right); run a development or TestFlight build on an iPad | https://docs.expo.dev/distribution/app-stores/ |
| A18 | TestFlight build uploaded; Beta App Review passed for external testers | user | After E8. Sign in with Apple needs the capability on the App ID; EAS can set it up when it creates credentials, or enable it in the Apple Developer account | https://developer.apple.com/testflight/ |

## Google Play

| # | Item | Status | Evidence or next step | Source |
|---|---|---|---|---|
| G1 | Developer account ($25 one-time) | done | Developer says the personal account exists (created 2026) | https://support.google.com/googleplay/android-developer/answer/10841920 |
| G2 | Android developer verification (registered when the app is created in Play Console) | user | Happens when you create the app (G3) | https://developer.android.com/developer-verification |
| G3 | App created in Play Console | user | Create "Streaks" with package `dev.storeready.streaks` before the first `eas submit` | https://docs.expo.dev/submit/android/ |
| G4 | Package name set | done | `app.json` `android.package`: `dev.storeready.streaks` | app config |
| G5 | New versionCode for this upload | done | `app.json` `android.versionCode` 1; raise for every upload or let EAS manage it | https://docs.expo.dev/submit/introduction/ |
| G6 | Target API 36 (Wear OS/Automotive 35, TV/XR 34) | done | Expo SDK 58 default 36, no override; list-permissions `targetSdk.ok: true` | https://developer.android.com/google/play/requirements/target-sdk |
| G7 | Android App Bundle (.aab) | todo | No `eas.json` yet. `eas build:configure` creates a production profile that builds an .aab (E1) | https://developer.android.com/guide/app-bundle |
| G8 | Play App Signing; upload key kept safe | user | Let EAS generate the keystore on the first build; it is your upload key. Do not delete it from EAS | https://developer.android.com/studio/publish/app-signing |
| G8a | 16 KB page sizes: native libraries in the release build are 16 KB aligned (required for updates from 2027-02-01) | todo | After E6: open the AAB's APK in APK Analyzer and check the Alignment column, or watch for the Play Console warning on upload | https://developer.android.com/guide/practices/page-sizes |
| G9 | Data safety form, including SDK data | user | Answers ready: `store/data-safety.android.md` (collects nothing). Required before the closed test release | https://support.google.com/googleplay/android-developer/answer/10787469 |
| G10 | Permission declarations | n/a | READ_MEDIA_IMAGES removed and blocked; no permission needs a declaration (`store/data-safety.android.md`) | play-data-safety skill |
| G11 | Content rating (IARC) | user | Answers ready: `store/age-rating.md`, Google Play section | https://support.google.com/googleplay/android-developer/answer/9898843 |
| G11a | Ads declaration (including ads from SDKs) | user | Answer No: `store/age-rating.md`, ads and target audience section | https://support.google.com/googleplay/android-developer/answer/9859455 |
| G11b | Target audience and content (target age groups; Families policy if under 13) | user | The user picks the age groups; nothing in the app is aimed at children | https://support.google.com/googleplay/android-developer/answer/9867159 |
| G12 | App access / sign-in details | user | `store/app-access.android.txt` | https://support.google.com/googleplay/android-developer/answer/9859455 |
| G13 | Account deletion: in-app path and web link | user | In app: Settings > Delete account. Web page written at `docs/delete-account.md`; live once pushed to https://github.com/NokNok-0/store-ready/blob/main/examples/habit-tracker/docs/delete-account.md. Open it logged out on a phone, then enter it in the Data safety form | https://support.google.com/googleplay/android-developer/answer/13327111 |
| G14 | Privacy policy URL | user | Same URL as A12; enter it in Play Console > App content > Privacy policy and on the store listing | https://support.google.com/googleplay/android-developer/answer/10787469 |
| G15 | Listing text within limits | done | `store/listing.android.json`; measure.mjs 0 errors | https://support.google.com/googleplay/android-developer/answer/9859152 |
| G16 | Icon 512x512, feature graphic 1024x500, 2+ phone screenshots | todo | `store/screenshots/android/`: icon, feature graphic, 4 phone screenshots at 1080x2160; check-sizes passes. Compare the web captures with a device before upload | https://support.google.com/googleplay/android-developer/answer/1078870 |

## Build and submit (EAS)

| # | Item | Status | Evidence or next step | Source |
|---|---|---|---|---|
| E1 | `eas.json` has development, preview and production profiles | todo | No `eas.json`. Run `npm i -g eas-cli`, `eas login`, `eas build:configure` | https://docs.expo.dev/build/eas-json/ |
| E2 | Credentials: Android keystore and iOS certificates managed by EAS or `credentials.json` | user | Let EAS manage them; you sign in with your Apple ID yourself | https://docs.expo.dev/app-signing/security/ |
| E3 | Google service account key available to EAS, not committed | user | Create it in Google Cloud for Play Console; keep it out of git (`.gitignore` does not list `*.json` keys: store it outside the repo) | https://docs.expo.dev/submit/android/ |
| E4 | App Store Connect API key for CI (Account Holder or Admin) | n/a | Only for CI; interactive `eas submit` works without it | https://docs.expo.dev/submit/introduction/ |
| E5 | Version and build number increment confirmed | todo | Decide in `eas.json`: keep `ios.buildNumber`/`android.versionCode` in `app.json` and raise them by hand, or let EAS manage them remotely (read the eas.json schema for the option) | https://docs.expo.dev/submit/introduction/ |
| E6 | `eas build -p all --profile production` | todo | After E1. Cloud build; works from Windows | https://docs.expo.dev/build/setup/ |
| E7 | `eas submit -p android` to the internal track with `releaseStatus: "draft"` | todo | After G3 and E3, and only with your go-ahead for that upload. Then promote to the closed test (item 1) | https://docs.expo.dev/submit/android/ |
| E8 | `eas submit -p ios` to App Store Connect / TestFlight | todo | After item 4 and E6, and only with your go-ahead for that upload | https://docs.expo.dev/submit/testflight/ |
| E9 | Builds left this month on the free plan (15 Android, 15 iOS) | user | Plan: 1 Android + 1 iOS production build for the first upload, plus 1 each per fix. Check the Expo dashboard for the count used | https://expo.dev/pricing |

## Next three actions

1. You: confirm Apple Developer Program membership (item 4) and push this branch so the privacy policy, deletion page and support URLs are live (A12, A13, G13).
2. You, with us: `eas build:configure`, then `eas build -p android --profile production` and `eas submit -p android` as a draft to internal testing (E1, E6, E7), and fill Data safety (G9) so the closed test can start.
3. You: start the closed test with 12+ testers (item 1); production access no earlier than 14 days after the 12th tester opts in.
