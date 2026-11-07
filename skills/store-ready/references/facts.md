# Facts that change the plan

Copied from `docs/sources/` (checked 2026-11-07). Each fact has its source. Compare dates with today's date before you mention them: a deadline that has passed is now a requirement.

## Google Play accounts

- Personal accounts created after 2023-11-13 must run a closed test with at least 12 testers opted in continuously for at least 14 days before applying for production access. https://support.google.com/googleplay/android-developer/answer/14151465
- Personal accounts use the legal name and address from the Google Payments profile and may need a government ID. Organization accounts need a D-U-N-S number, which can take 30+ days. One-time registration fee $25. https://support.google.com/googleplay/android-developer/answer/10841920, https://support.google.com/googleplay/android-developer/answer/13628312, https://support.google.com/googleplay/android-developer/answer/13634885
- Android developer verification: enforcement began 2026-09-30 in Brazil, Indonesia, Singapore and Thailand for certified devices on Android 7+; global rollout in 2027. For most Play developers, existing Play verification counts. https://developer.android.com/developer-verification
- Data safety form is required for every app on closed, open or production tracks, even apps that collect nothing. https://support.google.com/googleplay/android-developer/answer/10787469

## Google Play build requirements

- From 2026-08-31, new apps and updates must target API 36 (Android 16). Wear OS and Automotive need 35; TV and XR need 34. Extension requests closed on 2026-11-01. https://developer.android.com/google/play/requirements/target-sdk
- New apps must be uploaded as an Android App Bundle (AAB). https://developer.android.com/guide/app-bundle
- Play App Signing is required for apps created after August 2021. https://developer.android.com/studio/publish/app-signing

## Apple

- Store release builds on iOS need the Apple Developer Program ($99/year). https://docs.expo.dev/build/setup/
- Since 2026-04-28, uploads must be built with Xcode 26+ and the 26 SDKs. From April 2027 the iOS 27 SDK (Xcode 27) is required. https://developer.apple.com/news/upcoming-requirements/, https://developer.apple.com/news/?id=k1mtkt1k
- Since 2026-09-09, apps must target iOS 13 or later. https://developer.apple.com/news/upcoming-requirements/
- Age rating: new descriptors Shared Location and Dating & Relationships (dating forces 18+) are required on submissions from 2026-11-16 and for all apps by 2027-01-12. https://developer.apple.com/news/?id=yxkh08us
- EU Digital Services Act trader status must be declared even if the app is not distributed in the EU. https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements
- Review time: 50% of submissions are reviewed in under 24 hours, 90% in under 48 hours. Over 40% of unresolved issues are guideline 2.1. https://developer.apple.com/distribute/app-review/
- TestFlight: up to 10,000 external testers; the first build of a version needs Beta App Review; at most 6 review submissions per 24 hours. Recorded in `docs/sources/apple.md` without a page URL; for anything beyond this, open https://developer.apple.com/testflight/ and read it.

## Building without a Mac (Expo)

- Cloud `eas build` and `eas submit` work from Windows, macOS and Linux. `eas build --local` does not support Windows. `npx expo run:ios` needs a Mac with Xcode. https://docs.expo.dev/submit/testflight/, https://docs.expo.dev/build-reference/local-builds/
- Every upload needs a new versionCode (Android) or buildNumber (iOS). https://docs.expo.dev/submit/introduction/
- EAS free plan: up to 15 Android and 15 iOS builds per month. https://expo.dev/pricing

## App icon (for checker icon issues)

- iOS: 1024×1024, square, unmasked (the system applies the mask). Avoid text, photos, Apple hardware, added gloss or shadows. Whether transparency is disallowed is not confirmed in our sources; read the Human Interface Guidelines page on app icons before telling the user. https://developer.apple.com/design/human-interface-guidelines/app-icons
- Google Play: 512×512, 32-bit PNG with alpha, up to 1024 KB. https://support.google.com/googleplay/android-developer/answer/1078870
