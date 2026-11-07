# store-ready (checker)

Reads an Expo, React Native, iOS or Android project and reports the issues that get apps rejected in App Store and Google Play review. Every issue has a fix and the official page it comes from. Files only by default: no network, no account, no code from your project is run. Node 20+, no dependencies.

A clean run means the project **passes the checks we know about**. It does not mean the app will be approved. When store files the checks read are missing (see `store.files`), the last line says "Code and config pass the checks we know about. Not checked yet: ..." instead, because a missing file is not a pass.

## Run

```sh
npx store-ready check            # current directory
npx store-ready check path/to/app --platform ios
npx store-ready check . --github --strict   # in CI
npx store-ready check . --verify-urls       # also open the URLs it finds
```

| Flag | Effect |
|---|---|
| `--json` | Print `{ version, project, issues, summary }` as JSON |
| `--github` | Print GitHub Actions annotations (`::error file=...::`) |
| `--platform ios\|android\|both` | Only show issues for one platform (issues for both are always shown) |
| `--config <file>` | Use this Expo config JSON instead of reading app config. Best input: `npx expo config --type introspect --json`, whose `ios.infoPlist` includes the purpose strings config plugins write |
| `--strict` | Warnings fail the run too |
| `--verify-urls` | Off by default. Sends HTTP HEAD (GET if HEAD fails or is refused, 10 s timeout) to every privacy policy, support and account deletion URL found, at most 20. The URLs come from the project, which may not be trusted, so only public hosts are contacted: each host and every redirect hop (up to 5) is resolved and refused if it is loopback, private, link-local or otherwise non-public. A final status outside 2xx, a timeout, a refused host or a network error is an error; a working URL is info. Only the status is checked, not the page content |
| `-h`, `--help` / `-v`, `--version` | Help / version |

Exit codes: `0` no errors (and no warnings with `--strict`), `1` errors found (or warnings with `--strict`), `2` usage error.

### Expo config

`app.json` is read fully. `app.config.js` / `app.config.ts` is read only when it exports a plain object literal; the file is never executed. If it computes values (a function, `process.env`, spreads), the checker says so and uses `app.json` if present. For a full read, including what config plugins add:

```sh
npx expo config --type introspect --json > store/expo-config.json
npx store-ready check --config store/expo-config.json
```

Native files are read when present: `ios/**/Info.plist`, `ios/**/PrivacyInfo.xcprivacy`, `ios/*.xcodeproj/project.pbxproj`, `AppIcon.appiconset`, `android/app/src/main/AndroidManifest.xml`, `android/**/build.gradle(.kts)`, `android/gradle.properties`, `package.json`. With installed dependencies, `node_modules/**/PrivacyInfo.xcprivacy` is read too (see `ios.privacy-manifest`).

## Checks

| Id | What it checks |
|---|---|
| `ios.purpose-strings` | Purpose strings exist for permissions that Expo packages request (`expo-camera`, `expo-image-picker`, `expo-location`, `expo-contacts`, `expo-calendar`, `expo-media-library`, `expo-tracking-transparency`, and `expo-av` / `expo-audio` when recording code is found), from `ios.infoPlist`, config plugin options or `Info.plist`. Missing: error. Generic (under 25 characters, template phrasing, no reason given, or Expo's "Allow $(PRODUCT_NAME) to access ..." default): warning. Plugin defaults: warning when a plugin below is in `plugins` (or its package is installed, since Expo may apply it automatically), the option is unset (not `false`) and no other source sets the key, because the package's generic default text will ship. |
| `ios.privacy-manifest` | Declared required-reason APIs use a known category and a valid reason code for it (error). With `node_modules` installed: every `PrivacyInfo.xcprivacy` in dependency packages is read, and each required-reason category a package declares but the app does not (`expo.ios.privacyManifests`, or the app's own `PrivacyInfo.xcprivacy`) is a warning that names the packages and the reasons they use (suggested, for you to confirm). Package reasons missing from a declared category: info. Without `node_modules`: one info saying the comparison needs installed dependencies. |
| `android.target-sdk` | A literal target SDK below 36 (`expo-build-properties`, `build.gradle`, `gradle.properties`): error. Expo SDK 58+ without an override passes; otherwise info. |
| `android.permissions` | Lists declared permissions (info) and warns on those that need Play declarations: `READ_MEDIA_IMAGES/VIDEO`, `ACCESS_BACKGROUND_LOCATION`, `USE_EXACT_ALARM`, `FOREGROUND_SERVICE_*`, `USE_FULL_SCREEN_INTENT`, `MANAGE_EXTERNAL_STORAGE`, `QUERY_ALL_PACKAGES`. |
| `app.identity` | iOS bundle identifier and Android package (error if missing), version, build number / versionCode (info). |
| `app.icon` | Icon files exist; iOS icon is 1024x1024 and square (error). Alpha on the iOS icon is an info note for native projects only (Expo generates the native icons and flattens transparency). Play icon in `store/screenshots/android/icon/`: 512x512 PNG, at most 1024 KB. |
| `app.template-content` | Error (both stores) when a configured icon, `ios.icon` variant, adaptive icon layer, splash image (`splash`, `expo-splash-screen` plugin), `web.favicon` or native AppIcon image is byte-identical (SHA-256) to an Expo template asset (`TEMPLATE_ASSETS`, currently the SDK 58 template). Warning for placeholder text (`PLACEHOLDER_PATTERNS`): `example.com`/`example.org`/`test.com` emails and links, "lorem ipsum", "coming soon", "not available yet" in source; "TODO" in JSX text or title/label-style props; all of these plus unfilled `{{FIELD}}` template fields in `store/listing.*.json`, `store/review-notes.txt` and other `store/*.txt`. Comments, `placeholder=` format hints and test files are skipped; `store/*.md` working notes are not scanned. |
| `account.deletion` | Heuristic: sign-up code without deletion UI users can reach (warning, both stores). Passes only on "Delete account" / "Delete my account" / "Delete your account" / "Request account deletion" text in a `.js/.jsx/.tsx` file (navigator header titles do not count), or a route file named `delete-account`, `deleteAccount` or `account-deletion` under `app/` or `src/app/`. A `deleteAccount()` / `deleteUser` call alone does not pass; the message names it. |
| `login.apple-equivalent` | Heuristic: Google, Facebook or other OAuth login without Sign in with Apple (warning, guideline 4.8). |
| `privacy.policy-url` | Privacy policy URLs in `store/listing.*.json` (`privacyPolicyUrl`), app config `extra`, or source code. Each distinct URL found is an info that says it was **found, not verified** (and where it was found); none found: warning. |
| `app.links` | Support and account deletion URLs in app config `extra` (keys such as `supportUrl`, `support`, `helpUrl`, `accountDeletionUrl`, `deleteAccountUrl`, `deletionUrl`, any case, `_`/`-` ignored, nested up to 3 levels): each is an info that says it was found, not verified. Deletion URLs cite Google Play's rule that the web deletion link must load without error. |
| `store.listing-limits` | `store/listing.ios.json` and `store/listing.android.json` field limits (iOS keywords counted in bytes), and `store/review-notes.txt` at most 4,000 bytes. Warning for price words (`free`, `sale`, `$`, `€`, `% off`) and ranking claims (`best`, `top`, `ultimate`, `#1`, `number one`, `No. 1`) as whole words in the iOS name and subtitle (guideline 2.3.7) and the Play title; descriptions are not checked for them. |
| `store.screenshots` | `store/screenshots/ios/{iphone,ipad}/` sorted into Apple's device classes by pixel size, 1-10 per class, no alpha or transparency, unknown sizes are errors; "iPhone with Dynamic Island (medium display)" (1179x2556 or 1206x2622) is required, and iPad 13-inch (2064x2752 or 2048x2732) when the app runs on iPad. `store/screenshots/android/{phone,tablet,feature-graphic}/`: 320-3840 px per side, at most 2:1, no alpha, 2-8 per device type; feature graphic 1024x500. |
| `store.files` | Info, per store the app targets, listing which of `store/listing.ios.json`, `store/review-notes.txt`, `store/privacy.ios.md`, `store/screenshots/ios/` (iOS) and `store/listing.android.json`, `store/data-safety.android.md`, `store/screenshots/android/` (Android) are missing (a screenshots folder without images counts as missing). These also go into the "Not checked yet" footer. |
| `play.closed-testing` | Reminder (info): new personal Play accounts need 12 testers opted in for 14 days before production. |

The heuristic checks scan `.js/.jsx/.ts/.tsx` files in `src/`, `app/`, `components/`, `screens/`, `lib/`, `features/`, `hooks/`, `services/`, `context(s)/`, `navigation/`, `utils/` and root `App.*` / `index.*`, skipping `node_modules`, tests (`__tests__/`, `*.test.*`, `*.spec.*`) and native folders. The patterns are exported lists in each check module.

### Config plugin defaults

The `ios.purpose-strings` plugin-default warning covers only options whose default text we are sure the plugin writes (`PLUGIN_DEFAULT_PURPOSE_STRINGS`):

| Package | Option | Info.plist key |
|---|---|---|
| `expo-image-picker` | `photosPermission`, `cameraPermission`, `microphonePermission` | `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` |
| `expo-camera` | `cameraPermission`, `microphonePermission` | `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` |
| `expo-location` | `locationWhenInUsePermission`, `locationAlwaysAndWhenInUsePermission`, `locationAlwaysPermission` | `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSLocationAlwaysUsageDescription` |
| `expo-contacts` | `contactsPermission` | `NSContactsUsageDescription` |
| `expo-media-library` | `photosPermission`, `savePhotosPermission` | `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription` |
| `expo-calendar` | `calendarPermission` | `NSCalendarsUsageDescription` |

Set the option to your own sentence, or to `false` if the app does not use that permission. With `--config` introspect output the final `ios.infoPlist` is read directly, so default text shows up as a generic-string warning instead.

### Package privacy manifests

The `node_modules` walk handles npm, Yarn and pnpm (`node_modules/.pnpm/`) layouts and nested `node_modules`, follows symlinks only when they stay inside the project (others are skipped and counted in an info), skips `example(s)/`, `test(s)/`, `android/` and similar folders inside packages, and stops at 6 levels inside a package, 4 nested `node_modules` levels, 60,000 directories and 256 KB per manifest. Hoisted dependencies outside the project root (monorepo root `node_modules`) are not read.

## What it cannot check

- Whether a URL works, unless you pass `--verify-urls`; even then, only the HTTP status, not what the page says or whether it is the right page.
- Runtime behaviour: crashes, broken flows, a backend that is down, demo accounts that do not work, buttons that do nothing or fake integrations (a "Continue with Google" button that never calls Google). Placeholder text is found only for the patterns listed above.
- Template artwork other than byte-identical copies of the template files in `TEMPLATE_ASSETS` (an edited or re-exported template icon is not detected), and whether artwork belongs to another brand.
- Server behaviour: whether account deletion actually deletes data, token revocation, what your API collects. `account.deletion` finds a screen or button, not whether it works or can be reached from the app's navigation.
- Console-only settings: App Privacy answers, Data safety form, content rating, age rating, export compliance, EU trader status, pricing, Play declarations themselves. The `store/*.md` answer files are only checked for existence.
- Permissions and privacy manifests that libraries add at build time beyond what their `PrivacyInfo.xcprivacy` declares (merged Android manifests, CocoaPods without a manifest), and whether a package's declared reason matches how your app uses it.
- Purpose strings written by config plugins not listed above, unless you pass introspect output with `--config`.
- Content judgement: whether screenshots show the app in use, whether metadata is accurate, minimum functionality, spam or copycat risk, trademark conflicts in the app name.

## Develop

```sh
npm test
```

Rules come only from `docs/sources/*.md` in the store-ready repository; a test fails if a check cites a URL that is not listed there.
