---
name: play-data-safety
description: Prepares an Android app for Google Play's privacy and permission review - Data safety form answers (including SDK and webview data), sensitive permission declarations (READ_MEDIA_IMAGES and the photo picker rule, ACCESS_BACKGROUND_LOCATION with prominent disclosure and demo video, USE_EXACT_ALARM, foreground service types, USE_FULL_SCREEN_INTENT, MANAGE_EXTERNAL_STORAGE, QUERY_ALL_PACKAGES, Accessibility) and target API 36. Finds every permission in an Expo or React Native project and removes unneeded ones with blockedPermissions. Use when the user mentions the Data safety form, Play Console App content, permission declaration, sensitive permissions, photo and video permissions, background location, foreground service, targetSdk or target API level, or wants to update the declarations after adding an SDK or permission. For a Google Play rejection or policy email, use rejection-fix first; it routes the fix here. Produces store/data-safety.android.md and manifest or app config fixes.
license: MIT
---

# play-data-safety

Use this skill before the first Play release on any testing track, whenever dependencies or permissions change, and when Play rejects an update over permissions or the Data safety form.

The Data safety form is required for every app on closed, open or production tracks, even one that collects nothing. For a new personal developer account that has to run a 14-day closed test, that makes this skill one of the first things to finish.

It produces:

- Fixes to the project: `android.blockedPermissions` (and plugin options) in Expo app config, or `tools:node="remove"` entries in `AndroidManifest.xml`; target SDK changes; code for any prominent disclosure that a kept permission requires.
- `store/data-safety.android.md`: the Data safety answers and the permission declarations the user pastes into Play Console, App content.

Every Google and Expo fact this skill uses is in [references/play-facts.md](references/play-facts.md) with its source. If you need a rule that is not there, open the official page and read it. Do not state a policy from memory.

## 1. Inventory the data

1. If `store/privacy.ios.md` exists and is current, start from its inventory (backend, auth, SDKs, AI providers). Re-check it for Android-only code and SDKs.
2. Otherwise build it: read `package.json`, app config and `plugins`, and the source. For each network call that sends user data, note what is sent and to whom.
3. Webviews count. Find every `WebView` (and in-app browser that runs inside the app) and note which sites and scripts it loads.
4. Find the account deletion URL. If the app has accounts and no deletion path, stop and run `account-deletion` first; the URL goes in the form. If `account-deletion` recorded that the accounts are created and operated offline (out of the policy's scope), copy that line and its reasoning instead of a URL.
5. Ask the user once, together, for what the code cannot tell you: the privacy policy URL (unless the project records one), what the backend does with the data if it is not in this repository, and whether any data is used for advertising.

## 2. Find every permission

Run from the project root:

```
node <this-skill>/scripts/list-permissions.mjs .
```

It reads `android.permissions` and `android.blockedPermissions` from app config, `android/app/src/main/AndroidManifest.xml` if present, and every library manifest in `node_modules`, then prints JSON with each permission and where it came from, the ones that need a Play declaration (`needsDeclaration`), the ones that point to a Data safety data type (`dataSafety`), foreground services, and the target SDK.

In an Expo project without `android/`, config plugins and the Expo template add permissions the script cannot see. Run `npx expo prebuild --platform android --no-install` and re-run the script. Always pass `--platform android`: Android prebuild runs on Windows, macOS and Linux, iOS prebuild does not run on Windows, and this skill needs only Android. (For the effective iOS Info.plist, `ios-privacy` reads `npx expo config --type introspect --json` instead.) Then clean up, because prebuild changes more than it adds:

- restore the `scripts` block in `package.json`: prebuild rewrites `"android"` and `"ios"` to `expo run:android` / `expo run:ios`. Copy the block before running it;
- delete `android/` (and `ios/`, if it appeared) if it was not there before or is in `.gitignore`;
- compare the project with its state before and revert anything else you did not mean to change.

The permissions report shows `maxSdkVersion` where a manifest limits a permission to older Android versions (for example storage permissions capped at 32). Such a permission is not requested on newer devices; still map it, but do not treat it as full storage access.

The template can add permissions no feature uses (an earlier run found `SYSTEM_ALERT_WINDOW` in the generated main manifest). Treat them like any other permission in step 3: no feature, block it.

The script's list is an approximation. The merged manifest of a release build is what Play sees: get it from an EAS `.aab` with `bundletool dump manifest --bundle app.aab`, or from a local release build, and pass it with `--manifest <file>`. Details and fallbacks: [references/permissions.md](references/permissions.md).

## 3. Remove what is not needed

For every permission, find the feature that uses it. No feature, no permission.

- Expo: add the full permission name to `android.blockedPermissions`, and switch off the permission in the plugin's options if it has one.
- Bare React Native: add `<uses-permission android:name="…" tools:node="remove" />` to the app manifest.
- Then exercise the library feature that wanted it, or confirm the app never calls that code path.

Never add a permission to make a warning go away.

## 4. Handle the permissions that need declarations

For each entry in `needsDeclaration`, remove it, replace it, or keep it and prepare the declaration. The short version (full procedure in [references/permissions.md](references/permissions.md)):

| Permission | Default action |
|---|---|
| `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` | Block. Use the system photo picker. Keep only if core functionality cannot work with the picker, with a declaration |
| `ACCESS_BACKGROUND_LOCATION` | Block unless one core feature needs it. If kept: declaration, prominent in-app disclosure before the runtime prompt, demo video of 30 seconds or less, privacy policy covering location, test credentials |
| `USE_EXACT_ALARM` | Only alarm, timer or calendar apps, with a declaration. Others use `SCHEDULE_EXACT_ALARM` and handle it not being granted, or block both |
| `FOREGROUND_SERVICE_*` | For each service the app really starts: the type and permission in the manifest, and in App content a description, the user impact if interrupted, a demo video and the use case. Block what a library adds but the app never starts |
| `USE_FULL_SCREEN_INTENT` | Auto-granted only for alarm and calling apps on Android 14+. Remove, or keep with a fallback |
| `MANAGE_EXTERNAL_STORAGE`, `QUERY_ALL_PACKAGES`, Accessibility | Remove unless a core feature cannot work without it. If kept, read the policy page and prepare the declaration |

If a kept permission needs a prominent disclosure screen, build it in the app, matching the project's UI code, and shown before the system prompt. Read the policy page for what the disclosure must say; do not write it from memory.

For every declaration, write into the answers file the Play Console form it goes in, the text to paste, and a shot list for any demo video.

## 5. Target API level

New apps and updates must target API 36 since 2026-08-31 (Wear OS and Automotive 35; TV and XR 34). Extension requests closed on 2026-11-01.

Read `targetSdk` from the script output.

- Expo SDK 58 targets 36 by default. If `expo-build-properties` sets `android.targetSdkVersion` lower, raise it or remove the override.
- Older Expo SDKs: upgrading the SDK is usually the cleanest path. Tell the user what the upgrade involves before starting it; it is not a one-line change.
- Bare React Native or native: set `targetSdkVersion` (or `targetSdk`) to 36 in the Gradle files and check that `compileSdk` is at least that.

Raising the target changes runtime behaviour. List the behaviour changes the user should test, from https://developer.android.com/about/versions/16/behavior-changes-16, after you have read that page; if it does not load, link https://developer.android.com/google/play/requirements/target-sdk and tell the user to review the behaviour changes there.

## 6. Write the Data safety answers

1. Open https://support.google.com/googleplay/android-developer/answer/10787469 and read the current data types, purposes, and how Google defines collection and sharing.
2. Open the privacy policy URL and the delete account URL, in a browser or with `node -e "fetch(process.argv[1]).then(r=>console.log(r.status,r.url),e=>console.log('failed',e.message))" <url>`. Record the HTTP status and today's date next to each in the answers file. Play's help page says the deletion link "must be functional (for example, loads without error)". A URL that does not load is a blocking item under "Questions for the user", not a filled answer. `npx store-ready check --verify-urls` checks the URLs the checker finds; without the flag it reports them as "found, not verified".
3. Fill `store/data-safety.android.md` from [references/data-safety-template.md](references/data-safety-template.md): overview answers, one row per data type with every source (backend, SDKs, webviews), the SDKs reviewed, the permission decisions, the declarations, the delete account URL, and what was not verified.
4. For each SDK, read the vendor's own Data safety guidance and this project's configuration of it. If the vendor publishes nothing, say so and tell the user. expo-updates with Expo Update adds Device or other IDs and Crash logs (https://docs.expo.dev/eas-update/store-privacy-declarations/); see [references/play-facts.md](references/play-facts.md).
5. Use `dataSafety` from the script as prompts: a permission is not a data type, but each one should map to a row or to a note saying why the data never leaves the device.

Tell the user to paste the answers into Play Console, App content, Data safety, and submit each permission declaration in its own App content form. Inaccurate answers can block updates or get the app removed, so they must be updated whenever an SDK or data flow changes.

## Verify

- [ ] Re-run `node <this-skill>/scripts/list-permissions.mjs .` (with `--manifest` if you have a release build): every permission left has a feature you can name, and every `needsDeclaration` entry is either gone or has a declaration written in the answers file.
- [ ] For each blocked permission, the feature that library provides still works or is confirmed unused.
- [ ] `targetSdk.ok` is `true`, or the answers file says what the user must do to reach 36.
- [ ] `store/data-safety.android.md` exists, lists the privacy policy URL, the delete account URL (if the app has accounts), every SDK and webview, and no template example rows.
- [ ] Each URL in it carries the status and date you opened it. Any that did not load is listed as blocking and was reported to the user.
- [ ] If background location is kept: the disclosure screen exists in code, comes before the runtime prompt, and the video shot list is written.
- [ ] If you generated `android/` only to inspect it, it is deleted again, and `package.json` `scripts` match their state before prebuild.
- [ ] `npx store-ready check` reports no target SDK or permission errors.
- [ ] Tell the user the result passes the checks we know about. Do not say it will be approved.
