# Data safety answers: Streaks 1.0.0 (1)

Generated 2026-11-07 by store-ready play-data-safety. Paste into Play Console > App content > Data safety.
Data type names follow https://support.google.com/googleplay/android-developer/answer/10787469 as read on 2026-11-07.

Privacy policy URL: https://github.com/NokNok-0/store-ready/blob/main/examples/habit-tracker/docs/privacy-policy.md
Target SDK: 36 (Expo SDK 58 default; no `expo-build-properties` override; list-permissions `targetSdk.ok: true`)

Google's definition, read 2026-11-07: "Collect" means transmitting data from your app off a user's device; data "only processed locally on the user's device and not sent off device" does not need to be disclosed. Streaks sends nothing off the device (`src/` has no network calls; the `src/links.ts` URLs open in the browser).

## Overview

Does the app collect or share any of the required user data types? No
Is all user data encrypted in transit? Not asked when nothing is collected. If Play Console asks, no user data is transmitted.
Account creation: email and password, creating a profile stored on the device only (`src/auth.ts`). Sign in with Apple is iOS only.
Delete account URL: https://github.com/NokNok-0/store-ready/blob/main/examples/habit-tracker/docs/delete-account.md (opened 2026-11-07: HTTP 200)
In-app deletion path: Settings > Delete account (`src/app/settings.tsx`, `src/app/delete-account.tsx`)
Data retained after deletion: none (no server; `src/account.ts` deletes the profile, the habits and the habit photo files on the device)

Google's account deletion page (https://support.google.com/googleplay/android-developer/answer/13327111, read 2026-11-07) says "accounts that are created and operated offline are not app accounts and do not fall within policy scope". Streaks accounts are offline-only, but the app offers in-app deletion and the web page anyway, so the answers hold either way.

## Data types

| Data type | Collected by | Collected | Shared | Optional | Purposes | Notes |
|---|---|---|---|---|---|---|
| Email address (Personal info) | Mock auth, on device | No | No | n/a | n/a | AsyncStorage only, `src/auth.ts` |
| User IDs (Personal info) | Mock auth, on device | No | No | n/a | n/a | Local profile id, `src/auth.ts` |
| Photos (Photos and videos) | expo-image-picker | No | No | n/a | n/a | Local file URI saved with the habit, `src/photos.ts`, `src/habits-context.tsx` |
| Other user-generated content (App activity) | Habit store, on device | No | No | n/a | n/a | Habit names and check-ins, `src/habit-store.ts` |

Every row is "No". They are listed so the decision and its proof are on record.

## SDKs and webviews reviewed

| Package or webview | Version | What it sends | Source checked |
|---|---|---|---|
| expo-image-picker | 58.0.10 | Nothing; uses the system photo picker on Android 13+ (`PickVisualMedia` in `ImageLibraryContract.kt`) | node_modules source, `app.json` plugin options |
| expo-image | 58.0.18 | Nothing for local URIs | `src/components/habit-thumbnail.tsx` |
| expo-file-system | 58.0.13 | Nothing | `src/photos.ts` |
| @react-native-async-storage/async-storage | 2.2.0 | Nothing | `src/auth.ts`, `src/habit-store.ts` |
| expo-crypto | 58.0.7 | Nothing | `src/auth.ts` |
| expo-apple-authentication | 58.0.2 | Not active on Android (`isAvailableAsync` is false; the button is gated on `Platform.OS === 'ios'`) | `src/components/apple-sign-in.tsx` |
| Webviews | none | none | no `react-native-webview` or in-app browser in `package.json` |

None of these Expo modules publishes Play Data safety guidance; none makes network requests in this app's use.

## Permissions

From `list-permissions.mjs` run against a temporary `npx expo prebuild --platform android` (the generated `android/` was deleted afterwards).

| Permission | Source (app config / plugin / library) | Decision | Declaration needed |
|---|---|---|---|
| android.permission.CAMERA | `app.json` android.permissions; expo-image-picker library manifest | Kept: "Take photo" on a habit (`src/photos.ts`) | No |
| android.permission.READ_MEDIA_IMAGES | was in `app.json` android.permissions | Removed, and added to `android.blockedPermissions`. "Choose photo" uses the system photo picker, which needs no permission on Android 13+ | No |
| android.permission.READ_MEDIA_VIDEO | none today | Blocked so no library can add it | No |
| android.permission.RECORD_AUDIO | expo-image-picker plugin default | Blocked (`microphonePermission: false`); the app never records video | No |
| android.permission.SYSTEM_ALERT_WINDOW | Expo template main manifest | Blocked; the app draws no overlays | No |
| android.permission.READ_EXTERNAL_STORAGE (maxSdkVersion 32) | expo-image-picker, expo-image, expo-file-system | Kept: the picker requests it on Android 12 and lower (`getMediaLibraryPermissions` in `ImagePickerModule.kt`) | No |
| android.permission.WRITE_EXTERNAL_STORAGE (maxSdkVersion 32) | expo-image-picker, expo-file-system | Kept: same as above | No |
| android.permission.INTERNET | Expo template, expo-image, expo-file-system | Kept: normal permission React Native needs | No |
| android.permission.ACCESS_NETWORK_STATE | expo-image | Kept: normal permission | No |
| android.permission.VIBRATE | Expo template | Kept: normal permission | No |

`needsDeclaration` is empty after these changes. No foreground services.

## Declarations to submit

None. With READ_MEDIA_IMAGES blocked, the Photo and video permissions declaration is not needed.

## Not verified

- Merged manifest not checked against a release build. After the first EAS production build, run `bundletool dump manifest --bundle app.aab > merged-manifest.xml` and `node <skill>/scripts/list-permissions.mjs . --manifest merged-manifest.xml`, or check the permission list in Play Console after upload.
- "Choose photo" with READ_MEDIA_IMAGES blocked: confirm on an Android 13+ device or emulator that the photo picker opens and the picture shows on the habit.
- Target API 36 behaviour changes (https://developer.android.com/about/versions/16/behavior-changes-16) not tested on a device. The target was already 36 by default; nothing was raised.
- The delete account URL and the privacy policy URL answered HTTP 200 on 2026-11-07 (`--verify-urls`, after the repository was published). Only the status code was checked; open both signed out in a browser before submitting.

## Questions for the user

- When sync, a backend or the Pro subscription is added, the answer to "collects data" changes. Update this file and the form before that release.
