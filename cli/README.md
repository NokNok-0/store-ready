# store-ready (checker)

Reads an Expo, React Native, iOS or Android project and reports the issues that get apps rejected in App Store and Google Play review. Every issue has a fix and the official page it comes from. Files only: no network, no account, no code from your project is run. Node 20+, no dependencies.

A clean run means the project **passes the checks we know about**. It does not mean the app will be approved.

## Run

```sh
npx store-ready check            # current directory
npx store-ready check path/to/app --platform ios
npx store-ready check . --github --strict   # in CI
```

| Flag | Effect |
|---|---|
| `--json` | Print `{ version, project, issues, summary }` as JSON |
| `--github` | Print GitHub Actions annotations (`::error file=...::`) |
| `--platform ios\|android\|both` | Only show issues for one platform (issues for both are always shown) |
| `--config <file>` | Use this Expo config JSON instead of reading app config |
| `--strict` | Warnings fail the run too |
| `-h`, `--help` / `-v`, `--version` | Help / version |

Exit codes: `0` no errors (and no warnings with `--strict`), `1` errors found (or warnings with `--strict`), `2` usage error.

### Expo config

`app.json` is read fully. `app.config.js` / `app.config.ts` is read only when it exports a plain object literal; the file is never executed. If it computes values (a function, `process.env`, spreads), the checker says so and uses `app.json` if present. For a full read:

```sh
npx expo config --json > store/expo-config.json
npx store-ready check --config store/expo-config.json
```

Native files are read when present: `ios/**/Info.plist`, `ios/**/PrivacyInfo.xcprivacy`, `ios/*.xcodeproj/project.pbxproj`, `AppIcon.appiconset`, `android/app/src/main/AndroidManifest.xml`, `android/**/build.gradle(.kts)`, `android/gradle.properties`, `package.json`.

## Checks

| Id | What it checks |
|---|---|
| `ios.purpose-strings` | Purpose strings exist for permissions that Expo packages request (`expo-camera`, `expo-image-picker`, `expo-location`, `expo-contacts`, `expo-calendar`, `expo-media-library`, `expo-tracking-transparency`, and `expo-av` / `expo-audio` when recording code is found), from `ios.infoPlist`, config plugin options or `Info.plist`. Missing: error. Generic (under 25 characters, template phrasing, no reason given): warning. |
| `ios.privacy-manifest` | Declared required-reason APIs use a known category and a valid reason code for it (error). AsyncStorage without a UserDefaults reason in app config: warning. |
| `android.target-sdk` | A literal target SDK below 36 (`expo-build-properties`, `build.gradle`, `gradle.properties`): error. Expo SDK 58+ without an override passes; otherwise info. |
| `android.permissions` | Lists declared permissions (info) and warns on those that need Play declarations: `READ_MEDIA_IMAGES/VIDEO`, `ACCESS_BACKGROUND_LOCATION`, `USE_EXACT_ALARM`, `FOREGROUND_SERVICE_*`, `USE_FULL_SCREEN_INTENT`, `MANAGE_EXTERNAL_STORAGE`, `QUERY_ALL_PACKAGES`. |
| `app.identity` | iOS bundle identifier and Android package (error if missing), version, build number / versionCode (info). |
| `app.icon` | Icon files exist; iOS icon is 1024x1024 and square (error); alpha on the iOS icon is info only. Play icon in `store/screenshots/android/icon/`: 512x512 PNG, at most 1024 KB. |
| `account.deletion` | Heuristic: sign-up code without an account deletion path (warning, both stores). |
| `login.apple-equivalent` | Heuristic: Google, Facebook or other OAuth login without Sign in with Apple (warning, guideline 4.8). |
| `privacy.policy-url` | A privacy policy URL in `store/listing.*.json` (`privacyPolicyUrl`), app config `extra`, or source code (warning if none). |
| `store.listing-limits` | `store/listing.ios.json` and `store/listing.android.json` field limits (iOS keywords counted in bytes), and `store/review-notes.txt` at most 4,000 bytes. |
| `store.screenshots` | `store/screenshots/ios/{iphone,ipad}/` sorted into Apple's device classes by pixel size, 1-10 per class, no alpha or transparency, unknown sizes are errors; "iPhone with Dynamic Island (medium display)" (1179x2556 or 1206x2622) is required, and iPad 13-inch (2064x2752 or 2048x2732) when the app runs on iPad. `store/screenshots/android/{phone,tablet,feature-graphic}/`: 320-3840 px per side, at most 2:1, no alpha, 2-8 per device type; feature graphic 1024x500. |
| `play.closed-testing` | Reminder (info): new personal Play accounts need 12 testers opted in for 14 days before production. |

The heuristic checks scan `.js/.jsx/.ts/.tsx` files in `src/`, `app/`, `components/`, `screens/`, `lib/`, `features/`, `hooks/`, `services/`, `context(s)/`, `navigation/`, `utils/` and root `App.*` / `index.*`, skipping `node_modules`, tests and native folders. The patterns are exported lists in each check module.

## What it cannot check

- Runtime behaviour: crashes, broken flows, placeholder content, a backend that is down, demo accounts that do not work.
- Server behaviour: whether account deletion actually deletes data, token revocation, what your API collects.
- Console-only settings: App Privacy answers, Data safety form, content rating, age rating, export compliance, EU trader status, pricing, Play declarations themselves.
- Permissions and privacy manifests that libraries add at build time (merged manifests, CocoaPods).
- Content judgement: whether screenshots show the app in use, whether metadata is accurate, minimum functionality, spam or copycat risk.

## Develop

```sh
npm test
```

Rules come only from `docs/sources/*.md` in the store-ready repository; a test fails if a check cites a URL that is not listed there.
