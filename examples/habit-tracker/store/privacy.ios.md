# App Privacy answers: Streaks 1.0.0

Generated 2026-11-07 by store-ready ios-privacy. Paste into App Store Connect > App Privacy.
Data type names follow https://developer.apple.com/app-store/app-privacy-details/ as read on 2026-11-07.

Privacy policy URL: https://github.com/NokNok-0/store-ready/blob/main/examples/habit-tracker/docs/privacy-policy.md
Data collected: No

Apple's definition, read 2026-11-07: "Collect" means transmitting data off the device in a way that lets you or your partners access it for longer than needed to service the request in real time, and "Data that is processed only on device is not 'collected' and does not need to be disclosed." Streaks sends nothing off the device: `src/` contains no `fetch`, XMLHttpRequest or WebSocket calls, and the only URLs (`src/links.ts`) are opened in the system browser when the user taps them.

In App Store Connect: App Privacy > Get Started > "Do you or your third-party partners collect data from this app?" > No.

## Data types

None collected.

## Not collected

| Data type (Apple's name) | Where it is used | Why it is not collected | Proof |
|---|---|---|---|
| Email Address | Mock account profile | Stored in AsyncStorage on the device only; never transmitted | `src/auth.ts` (`createMockSession`, `MOCK_USERS_KEY`) |
| User ID | Local profile id; Apple `user` identifier for Sign in with Apple | Stored on the device only; no identity token or authorization code is kept or sent | `src/auth.ts` (`signInWithApple`), `src/components/apple-sign-in.tsx` |
| Photos or Videos | Photo attached to a habit, from the camera or library | The picker returns a local file URI saved with the habit on the device | `src/photos.ts`, `src/habits-context.tsx` (`setPhoto`) |
| Other User Content | Habit names and check-in dates | AsyncStorage on the device only | `src/habit-store.ts` |
| Crash Data | n/a | No crash reporting SDK; expo-updates is not installed | `package.json` |

## Third-party SDKs reviewed

| Package | Version | What it sends | Source checked |
|---|---|---|---|
| expo-apple-authentication | 58.0.2 | Shows Apple's system sign-in sheet; Apple returns a credential to the app. The app keeps only `user` and `email` locally | https://docs.expo.dev/versions/latest/sdk/apple-authentication/ ; `src/components/apple-sign-in.tsx` |
| expo-image-picker | 58.0.10 | Nothing; returns a local URI | `src/photos.ts`; plugin options in `app.json` |
| expo-image | 58.0.18 | Nothing for local `file://` URIs; it can load remote URLs, but the app passes only picker URIs | `src/components/habit-thumbnail.tsx` |
| expo-file-system | 58.0.13 | Nothing; deletes habit photo files on account deletion | `src/photos.ts` (`deletePhotos`) |
| @react-native-async-storage/async-storage | 2.2.0 | Nothing; local key-value storage | `src/auth.ts`, `src/habit-store.ts` |
| expo-crypto | 58.0.7 | Nothing; generates local ids | `src/auth.ts` |

scan-deps `dataCollection` and `ai.packages` were empty.

## Third-party AI

None. scan-deps found no AI packages and no AI hosts in source.

## Tracking

Tracking permission requested: No
Reason: none. No ad, analytics or attribution SDK.
The app works if the user declines: n/a. Camera and photo permissions are requested only when the user taps "Take photo" or "Choose photo" on a habit (`src/photos.ts`); on denial `src/app/habit/[id].tsx` shows "Camera access is off. You can turn it on in Settings." and the rest of the app keeps working.

## Purpose strings (final values, from `npx expo config --type introspect`)

- NSCameraUsageDescription: "Streaks uses the camera to take a picture for a habit, for example your running shoes for a daily run. Photos stay on this device." (expo-image-picker plugin `cameraPermission`)
- NSPhotoLibraryUsageDescription: "Streaks opens your photo library so you can choose a picture for a habit, for example a photo of the book you are reading." (plugin `photosPermission`)
- NSMicrophoneUsageDescription: removed (`microphonePermission: false`); the app picks images only.

## Privacy manifest

`expo.ios.privacyManifests.NSPrivacyAccessedAPITypes` in `app.json` carries every category and reason from scan-deps `requiredReasonApis.aggregated`: UserDefaults CA92.1; FileTimestamp C617.1, 0A2A.1, 3B52.1; SystemBootTime 35F9.1; DiskSpace E174.1, 85F4.1. On re-run, `missingDeclarations` and `invalidReasonCodes` are empty.

## Privacy policy in the app

Settings > Privacy policy opens the URL above (`src/app/settings.tsx`, `src/links.ts`).

## Questions for the user

- When a backend, sync or the Pro subscription is added, these answers change (at least Email Address, User ID and Purchases). Update this file and App Store Connect before that release.
