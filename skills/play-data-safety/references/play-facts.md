# Facts this skill relies on

Copied from `docs/sources/google-play.md` and `docs/sources/expo.md` (checked 2026-11-07). Each fact has its source. If you need something that is not here, open the linked page and read it; do not fill the gap from memory.

## Data safety form

Source: https://support.google.com/googleplay/android-developer/answer/10787469

- Required for every app on closed, open or production tracks, even apps that collect nothing.
- Must include data collected by SDKs and by webviews in the app.
- A privacy policy is required.
- An inaccurate form can block updates or get the app removed.

The data types, purposes and questions in the form are defined on that page and in Play Console. Read them before filling `store/data-safety.android.md`; use Google's names exactly.

## Account deletion

Source: https://support.google.com/googleplay/android-developer/answer/13327111

Apps that let users create an account must offer an in-app deletion path, a web link to request deletion without reinstalling, deletion of the associated data (disclosing anything retained), and declare it in the Data safety form. The `account-deletion` skill builds this; this skill records the URL in the form answers.

## Permission declarations

| Permission or API | Rule | Source |
|---|---|---|
| `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` | Only when the system photo picker cannot support the app's core functionality, with a declaration | https://support.google.com/googleplay/android-developer/answer/14115180 |
| `ACCESS_BACKGROUND_LOCATION` | Declaration for one core feature; demo video of 30 seconds or less showing the prominent in-app disclosure and the runtime prompt; privacy policy covering location; test credentials if login is needed | https://support.google.com/googleplay/android-developer/answer/9799150 |
| `USE_EXACT_ALARM` | Only for alarm, timer or calendar apps, with a declaration. Other apps use the user-granted `SCHEDULE_EXACT_ALARM` | https://support.google.com/googleplay/android-developer/answer/16558241 |
| Foreground services | For target 14+, declare each foreground service type and its `FOREGROUND_SERVICE_*` permission. In App content give a description, the user impact if the service is interrupted, a demo video, and the use case | https://support.google.com/googleplay/android-developer/answer/13392821 |
| `USE_FULL_SCREEN_INTENT` | Auto-granted only for alarm and calling apps (Android 14+) | `docs/sources/google-play.md` |
| `MANAGE_EXTERNAL_STORAGE` | Needs a declaration | `docs/sources/google-play.md` |
| `QUERY_ALL_PACKAGES` | Needs a declaration | `docs/sources/google-play.md` |
| Accessibility API | Needs a declaration | `docs/sources/google-play.md` |

For the last four, our sources record only that a declaration is needed or when the permission is granted. Before keeping one, read the current policy page in the Developer Program Policy, Permissions section: https://play.google/developer-content-policy/

## Target API level

Source: https://developer.android.com/google/play/requirements/target-sdk

- From 2026-08-31, new apps and updates must target API 36 (Android 16). Wear OS and Automotive need 35; TV and XR need 34.
- Existing apps must target 35 or higher to stay visible to new users on newer Android versions.
- Extensions could be requested until 2026-11-01. That date has passed.

## Expo

- SDK 58 defaults to targetSdk 36 and compileSdk 37 on Android. https://expo.dev/changelog/sdk-58
- A privacy policy is required. https://docs.expo.dev/distribution/app-stores/

App config keys used by this skill (verified on Expo docs 2026-11-07, not yet recorded in `docs/sources/expo.md`):

- `android.permissions`: permissions to add to `AndroidManifest.xml` during prebuild, for ones a library does not add itself. https://docs.expo.dev/guides/permissions/, https://docs.expo.dev/versions/latest/config/app/
- `android.blockedPermissions`: permissions to remove from the final `AndroidManifest.xml`, including ones a package's own manifest adds. Use the full name, for example `android.permission.RECORD_AUDIO`. Same sources.
