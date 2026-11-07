# Google Play: submission requirements outside the code

Copied from `docs/sources/google-play.md` and `docs/sources/expo.md` in the store-ready repo, checked 2026-11-07.

## Start these first

These take days or weeks and nothing else can make them faster.

| Item | Fact | Source |
|---|---|---|
| Closed test for new personal accounts | Personal developer accounts created after 2023-11-13 must run a closed test with at least 12 testers opted in, continuously, for at least 14 days before they can apply for production access. | https://support.google.com/googleplay/android-developer/answer/14151465 |
| D-U-N-S number | Organization accounts need a D-U-N-S number. Getting one can take 30+ days. | https://support.google.com/googleplay/android-developer/answer/13628312 |
| Identity verification | Personal accounts use the legal name and address from the Google Payments profile and may need a government ID. | https://support.google.com/googleplay/android-developer/answer/10841920, https://support.google.com/googleplay/android-developer/answer/13634885 |

The closed-test requirement is the item that most often surprises people. Plan backwards from it: the earliest production date is at least 14 days after the 12th tester opts in, plus the time to apply for production access and pass review. The clock needs a build on a closed track, so the first Android build should go up as soon as the app is usable, not when it is finished. Testers must stay opted in for the whole period; read the help page for what counts.

## Account

| Item | Fact | Source |
|---|---|---|
| Registration fee | One-time $25. | https://support.google.com/googleplay/android-developer/answer/10841920 |
| Android developer verification | Enforcement began 2026-09-30 in Brazil, Indonesia, Singapore and Thailand for certified devices on Android 7+; global rollout in 2027. For most Play developers, existing Play verification counts, and new apps are registered when created in Play Console. | https://developer.android.com/developer-verification |
| App created in Play Console | Required before `eas submit -p android`. | https://docs.expo.dev/submit/android/ |
| Google service account key | Required for `eas submit -p android`. | https://docs.expo.dev/submit/android/ |

## Build

| Item | Fact | Source |
|---|---|---|
| Target API level | From 2026-08-31, new apps and updates must target API 36 (Android 16). Wear OS and Automotive need 35; TV and XR need 34. Existing apps must target 35+ to stay visible to new users on newer Android versions. Extensions could be requested until 2026-11-01, which has passed. | https://developer.android.com/google/play/requirements/target-sdk |
| Expo SDK 58 | Defaults to targetSdk 36 and compileSdk 37. | https://expo.dev/changelog/sdk-58 |
| Android App Bundle | AAB required for new apps since August 2021; APKs cannot be submitted for new apps. The EAS production profile builds an .aab. | https://developer.android.com/guide/app-bundle, https://docs.expo.dev/build/eas-json/ |
| Play App Signing | Required for apps created after August 2021. You sign with an upload key; Google holds the app signing key; a lost upload key can be reset. | https://developer.android.com/studio/publish/app-signing |
| Version code | Every upload needs a new versionCode. | https://docs.expo.dev/submit/introduction/ |

With EAS-managed credentials, the keystore EAS generates is the key your uploads are signed with, which under Play App Signing is the upload key. Tell the user not to delete it from EAS; a lost upload key can be reset, but that is a delay they can avoid.

## App content declarations

| Item | Fact | Source |
|---|---|---|
| Data safety | Required for every app on closed, open or production tracks, even apps that collect nothing. Must include data collected by SDKs and webviews. Privacy policy required. Inaccurate forms can block updates or remove the app. | https://support.google.com/googleplay/android-developer/answer/10787469 |
| Content rating | Every app needs an IARC rating from the App content questionnaire. Unrated apps can be removed. Retake it when content changes. | https://support.google.com/googleplay/android-developer/answer/9898843, https://support.google.com/googleplay/android-developer/answer/9859655 |
| App access (sign-in details) | The App content page holds the forms to complete before release, including sign-in details for restricted parts of the app. | https://support.google.com/googleplay/android-developer/answer/9859455 |
| Account deletion | Apps with account creation need an in-app deletion path, a web link to request deletion without reinstalling, deletion of associated data, and a declaration in Data safety. "The weblink must be functional (for example, loads without error)". "accounts that are created and operated offline are not app accounts and do not fall within policy scope." | https://support.google.com/googleplay/android-developer/answer/13327111 |
| Permission declarations | Photo and video, background location, exact alarms, foreground services, full-screen intent, MANAGE_EXTERNAL_STORAGE, QUERY_ALL_PACKAGES and Accessibility API use have declarations. | See the play-data-safety skill |
| Pre-review checks | Play Console flags some issues before submission. | https://support.google.com/googleplay/android-developer/answer/14807773 |

## Store listing

| Item | Fact | Source |
|---|---|---|
| Text | App name 30, short description 80, full description 4,000 characters. | https://support.google.com/googleplay/android-developer/answer/9859152 |
| Icon | 512×512, 32-bit PNG with alpha, up to 1024 KB. | https://support.google.com/googleplay/android-developer/answer/1078870 |
| Feature graphic | 1024×500, JPEG or 24-bit PNG, no alpha. | https://support.google.com/googleplay/android-developer/answer/1078870 |
| Screenshots | At least 2 to publish, up to 8 per device type. | https://support.google.com/googleplay/android-developer/answer/1078870 |
