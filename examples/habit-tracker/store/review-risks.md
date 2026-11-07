# Review risks

## Product risks (2026-11-07)

App: Streaks, a habit tracker where the user adds daily habits, checks them off each day, sees the current and best streak per habit, and can attach a photo to a habit; everything is stored on the device.
Evidence base: project at examples/habit-tracker
Stores: iOS, Android
Result: 1 High (changed in the project), 2 Medium

### R0. App icon, adaptive icon, splash and favicon were Expo's template artwork (High, changed)

- Rule: Apple 4.1(c): do not use another developer's icon, brand or name; Apple 2.1 lists placeholder content as a completeness trigger.
- Evidence: `assets/images/icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`, `splash-icon.png` and `favicon.png` were the blue chevron artwork of the Expo project template, unrelated to Streaks. Found while rendering the feature graphic in store-screenshots; the checker reported only an alpha-channel note for `icon.png`.
- Why it matters: the icon is the first asset a reviewer sees; template artwork that carries Expo's mark is another developer's icon (4.1(c)) and reads as placeholder content (2.1).
- Change: replaced all six files with original artwork (a white check inside an open ring on the app's orange, `#E8590C`): `icon.png` 1024x1024 RGB without alpha, adaptive foreground/background/monochrome, splash glyph and favicon. `android.adaptiveIcon.backgroundColor` set to `#E8590C` in `app.json`.
- Sources: https://developer.apple.com/news/?id=ey6d8onl ; https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review

### R1. The store name "Streaks" may belong to another habit app (Medium)

- Rule: Apple 4.1(c): do not use another developer's icon, brand or name; Apple 4.1 copycats. Google Play Impersonation and Intellectual Property policy areas (not detailed in our sources).
- Evidence: `app.json:3` sets `"name": "Streaks"`; `README.md:1` and `src/components/auth-screen.tsx` (title "Streaks" on `src/app/sign-in.tsx:16`) use the same name. The category is habit tracking. Depends on: a search of both stores for "Streaks" in the habit category, which we could not run from the project.
- Why it matters: 4.1(c) rejects another developer's name; if an existing habit app is called Streaks, this one is that case.
- Change: Search both stores for "Streaks" before the first upload. If a habit app with that name exists, choose a name with no reference to it and change `expo.name` in `app.json`, the `title` prop in `src/app/sign-in.tsx`, the copy in `src/app/about.tsx`, both `store/listing.*.json` files and the privacy policy. The bundle ID `dev.storeready.streaks` can stay; it is not shown to users.
- Sources: https://developer.apple.com/help/app-review/guideline-reference/4-1-prevent-copycat-rejection ; https://developer.apple.com/news/?id=ey6d8onl ; https://play.google/developer-content-policy/

### R2. Habit tracking is a crowded category (Medium)

- Rule: Apple 4.3(b): saturated categories are treated as spam unless the app is clearly different. Our sources do not list which categories count as saturated.
- Evidence: the app's features are habits with daily check-off (`src/app/index.tsx`), streak counts (`src/streaks.ts`), habit detail with best streak and check-ins (`src/app/habit/[id].tsx`) and a photo per habit (`src/photos.ts`). Depends on: what Streaks does that other habit apps do not (not answered).
- Why it matters: 4.3(b) treats apps in saturated categories with no clear difference as spam.
- Change: Lead with what the code already does that a plain checklist does not: a photo per habit from the camera or library, and all data kept on the device with no account data leaving it. Make the first screenshot and the first line of both listings say that (done in `store/listing.*.json` and `store/screenshots/plan.md`). Read the current 4.3 text before the first submission.
- Sources: https://developer.apple.com/app-store/review/guidelines/ ; https://developer.apple.com/news/?id=a233fmpw

### Checked, no risk found

- 4.2 minimum functionality: native screens with state the user creates (habits, check-ins, photos) in `src/app/`; no web view, no link lists.
- 4.2.6 templates: no template vendor in `README.md`, `package.json` or `LICENSE`; no brand folders.
- 4.3(a) duplicates: one bundle ID and package (`dev.storeready.streaks`), no flavors, no `app.config.*` branching.
- 5.1.1(ix) regulated fields: no finance, health records, gambling, crypto or travel features.
- 1.2 user content: nothing one user creates is visible to another user; all data stays on the device.
- Play minimum and broken functionality: interactive app, not static content. Crashes not verifiable from files.
- Login methods and payments: covered by login-and-payments below.
- Account sign-up: covered by account-deletion (Settings > Delete account).
- AI providers: none (scan-deps `ai.packages` and `ai.hostsInSource` empty).
- Hidden features: none switched by flags; covered by mock-review.

### Not covered by our sources

- The auth in `src/auth.ts` is a local mock: any password of 8+ characters signs in to an existing email on the same device. Accounts never leave the device, so this is not a data-exposure problem today, but no guideline in our sources says whether a reviewer will accept a password that is not checked. Read 2.1 and 5.1.1 on https://developer.apple.com/app-store/review/guidelines/ before submitting. (The mock "Continue with Google" button was removed after the mock review; see Login and payments L1.)

## Login and payments (2026-11-07)

Stores: iOS, Android
Login methods found: email and password (local mock, `src/auth.ts`); Google (mock `signInWithGoogle` in `src/auth.ts`, button in `src/components/social-sign-in.tsx`; removed, see L1); Sign in with Apple (added, `src/components/apple-sign-in.tsx`)
Paid features found: "Streaks Pro" paywall stub with a disabled Subscribe button (`src/app/paywall.tsx`, removed), reached from Settings and from a 5-habit cap in `src/app/index.tsx` (removed). No purchases SDK.
Result: 0 open, 3 resolved

### L1. Google sign-in without an equivalent login option (resolved)

- Rule: Apple 4.8 Login services. A third-party or social login used for the user's account needs an equivalent option that limits data to name and email, allows hiding the email, and does no ad tracking without consent; Sign in with Apple qualifies.
- Evidence: `src/components/social-sign-in.tsx` showed "Continue with Google" on both `src/app/sign-in.tsx` and `src/app/sign-up.tsx`; the Google sign-in creates the user's Streaks account (`src/auth.ts`, `signInWithGoogle`). The checker raised `login.apple-equivalent`.
- Exception considered: none applies (consumer app; not company-only, education, enterprise, government ID, or a client for a third-party service).
- Decision: Add Sign in with Apple on iOS, on the same screens, above Google. Revised after the mock review on 2026-11-07: the Google button was a mock that never contacted Google and signed in `google.user@example.com` (a 2.1 finding), so it was removed. With only email/password and Sign in with Apple left, 4.8 no longer triggers; Sign in with Apple stays because the developer asked for it.
- Change: removed "Continue with Google", `signInWithGoogle` and the `google` provider from `src/components/social-sign-in.tsx`, `src/session.tsx`, `src/auth.ts` and `src/app/settings.tsx`. `expo-apple-authentication` installed with `npx expo install` and added to `plugins` in `app.json`; `ios.usesAppleSignIn: true`; `src/components/apple-sign-in.tsx` renders the button (and `src/components/social-sign-in.tsx` the "or" divider) only when `Platform.OS === 'ios'` and `isAvailableAsync()` is true, ignores `ERR_REQUEST_CANCELED`, and requests only the email scope (the app has no name field). `src/auth.ts` `signInWithApple` maps the Apple `user` identifier to a local mock profile; a null `email` (every sign-in after the first) does not fail. No identity token or authorization code is stored or sent anywhere.
- Status: resolved
- Sources: https://developer.apple.com/app-store/review/guidelines/

Account linking: an Apple user and an email user with the same address are separate local profiles; nothing is merged on an unverified email.

When a real backend replaces the mock: send `authorizationCode` to the server, exchange it, store the refresh token server side, and revoke it on account deletion (see account-deletion). The App ID needs the Sign in with Apple capability in the Apple Developer account; that console step is the developer's.

### L2. Pro paywall with a Subscribe button that cannot be used (resolved)

- Rule: 2.1 App completeness: in-app purchases that cannot be reviewed are a 2.1 rejection. 3.1.1: digital features unlocked in the app use in-app purchase with restore.
- Evidence: `src/app/paywall.tsx` showed "Streaks Pro" with a disabled "Subscribe" button and "Subscriptions are not available yet."; `src/app/settings.tsx` linked to it from a "Streaks Pro" row; `src/app/index.tsx` sent the user to it instead of adding a 6th habit (`FREE_HABIT_LIMIT = 5` in `src/habit-store.ts`). No product exists in any store and no purchases SDK is installed, so a reviewer could neither buy nor review it, and users could never add a 6th habit.
- Decision: Ship 1.0 without Pro. Remove the paywall route, the Settings row and the habit cap. Add Pro back with an IAP library, restore purchases on the paywall and in Settings, and an expired-subscription demo account when the subscription exists.
- Change: deleted `src/app/paywall.tsx`; removed the `paywall` screen from `src/app/_layout.tsx`, the "Plan" group from `src/app/settings.tsx`, the cap from `src/app/index.tsx` and `FREE_HABIT_LIMIT` from `src/habit-store.ts`.
- Status: resolved (needs the developer's confirmation that 1.0 ships with unlimited free habits)
- Sources: https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review ; https://developer.apple.com/app-store/review/guidelines/

### L3. Google Play payments (resolved)

- Rule: Google Play Payments and Subscriptions policies.
- Evidence: after L2 the Android build takes no payment in any form: no IAP, subscription, external checkout link, tips or donations.
- Decision: No payments on Android. Read https://support.google.com/googleplay/android-developer/answer/9858738 and https://support.google.com/googleplay/android-developer/answer/9900533 before Pro ships.
- Status: resolved
- Sources: https://play.google/developer-content-policy/

### Review notes to pass on

- Demo account: reviewer@storeready.dev, any password of 8 or more characters (local mock). No subscriptions, so no expired-subscription account.
- Sign in with Apple appears on iOS only, on the sign-in and create-account screens.

### Checked, no risk found

- 3.1.1 unlock codes: no license key, QR code or crypto unlock paths in `src/`.
- External purchase links: none in the app.

## Mock review 2026-11-07

Build: 1.0.0 (1 / 1), Expo SDK 58. Stores: iOS, Android.
Read: `app.json`, `package.json`, `src/app/`, `src/` (auth, account, session, photos, habit store, components), `store/` (listing.ios.json, listing.android.json, review-notes.txt, app-access.android.txt, privacy.ios.md, data-safety.android.md, age-rating.md, checklist.md, screenshots/ios/iphone, screenshots/ios/ipad, screenshots/android, earlier sections of this file), `docs/privacy-policy.md`, `docs/delete-account.md`. No server code exists.
Checker: 0 errors, 0 warnings, 3 info.
Second pass today. The first pass found 3 Blocking: the mock "Continue with Google" that never contacted Google and signed in `google.user@example.com` (2.1; fixed by login-and-payments, see L1), and the privacy policy and deletion page URLs returning 404 (still open below).

### Apple

#### Guideline 5.1.1(i) - Legal - Privacy Policy

Status: Blocking

Found
Settings > Privacy policy opens `https://github.com/NokNok-0/store-ready/blob/main/examples/habit-tracker/docs/privacy-policy.md` (`src/links.ts`, `src/app/settings.tsx`), and both listing files record the same URL. Opening it on 2026-11-07 returned HTTP 404. The policy exists only locally at `docs/privacy-policy.md`. The support URL (Settings > Help and support) and the deletion page linked from `src/app/delete-account.tsx` point to the same repository and could not be confirmed either. A broken link is also a 2.1 trigger.

Next steps
Publish `docs/privacy-policy.md` and `docs/delete-account.md` to the public repository at the paths in `src/links.ts`, make sure the repository's Issues page is public, then open all three URLs logged out on a phone. Enter the policy URL in App Store Connect > App Privacy. No code change is needed.

Source: https://developer.apple.com/app-store/review/guidelines/

#### Guideline 5.1.1(v) - Legal - Account Deletion

Status: Risk

Found
Settings > Delete account (`src/app/delete-account.tsx`) explains what is deleted, asks once, then `src/account.ts` deletes the profile, habits and photo files and signs out; a failure leaves the user signed in with an error (`src/__tests__/delete-account-screen.test.tsx`). Sign in with Apple is offered on iOS (`src/components/apple-sign-in.tsx`), and deletion does not call Apple's token revocation. The app never sends the `authorizationCode` anywhere and stores no tokens (`src/auth.ts` `signInWithApple` keeps only the `user` identifier; `src/__tests__/apple-sign-in.test.tsx` checks that no token reaches storage), so no Apple token exists for this app to revoke, and there is no server to hold the signing key.

Next steps
No change for this build. When a backend replaces `src/auth.ts`, send `authorizationCode` to it at sign-in, exchange it and store the refresh token server side, and revoke it in the deletion endpoint (noted under Login and payments L1).

Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion

### Google Play

#### Google Play - Account deletion

Status: Blocking

Found
In-app deletion exists (Settings > Delete account), data is deleted with nothing retained, and `store/data-safety.android.md` declares the delete account URL `https://github.com/NokNok-0/store-ready/blob/main/examples/habit-tracker/docs/delete-account.md`. That URL returned HTTP 404 on 2026-11-07; the page exists only locally at `docs/delete-account.md`.

Next steps
Publish `docs/delete-account.md` at that URL, open it logged out on a phone, then enter it in Play Console > App content > Data safety.

Source: https://support.google.com/googleplay/android-developer/answer/13327111

### Not verified

- Runtime: crashes, freezes and load failures cannot be seen from the files. Install the release build on a real iPhone, an iPad and an Android phone and walk sign-up, adding a habit, checking it off, adding a photo (camera and library, including "Don't Allow"), and Settings > Delete account.
- Demo account: it must be created on the review device ("Create an account"), as the notes say; sign-in alone fails on a fresh install. Try it on a fresh install of the release build.
- Sign in with Apple on a device: the button, the Apple sheet, cancel without an error, and a second sign-in where Apple returns no email. The App ID needs the Sign in with Apple capability.
- "Choose photo" on Android 13+ with READ_MEDIA_IMAGES blocked: the system photo picker should open.
- Screenshots were captured from the web build: compare all 12 with a native build (headers, back button, fonts, status bar) before upload (`store/screenshots/plan.md`).
- Store name: whether "Streaks" is already used by another habit app (4.1; Product risks R1). No check in this review's sources covers it.
- Merged Android manifest of a release build (`store/data-safety.android.md`, Not verified).
- App Store Connect and Play Console entries: App Privacy, Data safety, age rating, content rating, DSA trader status, export compliance, contact fields in App Review Information.

### Result

Blocking: 2. Risk: 1. Not verified: 8.
Fix first: publish the privacy policy and the deletion page at their GitHub URLs; both are linked from the app and the store forms and both return 404 today. This is a publishing step for the developer, not a code change.
Update 2026-11-07, after the repository was published: the privacy policy, support and deletion URLs all answered HTTP 200 with `npx @noknok-0/store-ready check --verify-urls`, so both Blocking items are resolved.
Passed: 2.1 demo account (one role, created on device, steps given, 2,218 bytes, ASCII); 2.1 no lorem, TODO, localhost or example.com account or link (the email field hint "you@example.com" is a format example); 4.8 (no third-party login left; Sign in with Apple offered); 3.1.1 (no purchases; paywall stub removed); 5.1.1(ii) purpose strings specific with examples, no microphone key; 5.1.2(i) no data sharing, permissions asked in context with a denial path; 2.5.19 no flags, no OTA, no unreachable routes; 2.3 metadata, every claim maps to code; 2.3.10 no other platform names in the iOS listing; 2.3.3 4 of 4 in use per size, required classes present; 2.3.14 no prices or claims in assets; 1.2 no shared user content; 1.5 support link in Settings; App Privacy and age rating consistent; Play Data safety, permissions (no declarations needed), target API 36, minimum functionality, listing limits, content rating.
