# Submission checklist

Prepared <YYYY-MM-DD> for <app name> <version> (<build number> / <versionCode>). Stores: <App Store, Google Play>.
Statuses: `done` (evidence given), `todo` (we can do it in the project), `user` (only the user can do it, in a console or account), `n/a` (does not apply, reason given).

## Start first

| # | Item | Status | Evidence or next step | Source |
|---|---|---|---|---|
| 1 | Play closed test: 12+ testers opted in for 14+ consecutive days (personal accounts created after 2023-11-13) | | Earliest production access: <date> | https://support.google.com/googleplay/android-developer/answer/14151465 |
| 2 | D-U-N-S number (Play organization accounts; can take 30+ days) | | | https://support.google.com/googleplay/android-developer/answer/13628312 |
| 3 | Play identity verification | | | https://support.google.com/googleplay/android-developer/answer/10841920 |
| 4 | Apple Developer Program membership ($99/year) | | | https://docs.expo.dev/build/setup/ |
| 5 | EU DSA trader status declared in App Store Connect (required even outside the EU) | | | https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements |

## Apple App Store

| # | Item | Status | Evidence or next step | Source |
|---|---|---|---|---|
| A1 | Bundle identifier set | | | app config |
| A2 | Version and a new build number for this upload | | | https://docs.expo.dev/submit/introduction/ |
| A3 | Built with Xcode 26+ and the 26 SDKs; deployment target iOS 13+ | | | https://developer.apple.com/news/upcoming-requirements/ |
| A4 | Export compliance: `ITSAppUsesNonExemptEncryption` set to the user's answer | | | https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance |
| A5 | Regulated medical device declaration, yes or no (EU/EEA, UK, US; category Health & Fitness or Medical, or "Frequent" Medical or Treatment Information) | | | https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status |
| A6 | Regulated field or sensitive data (5.1.1(ix)): Apple says it should be submitted by the legal entity providing the service | | | https://developer.apple.com/app-store/review/guidelines/ |
| A7 | App Privacy details, including SDK data | | `store/privacy.ios.md` | https://developer.apple.com/app-store/app-privacy-details/ |
| A8 | Privacy manifest reasons for required-reason APIs | | | https://developer.apple.com/support/third-party-SDK-requirements/ |
| A9 | Age rating, including social-media questions and the Shared Location and Dating & Relationships descriptors | | `store/age-rating.md` | https://developer.apple.com/news/?id=yxkh08us |
| A10 | Screenshots: at least one "iPhone with Dynamic Island (medium display)" (1179×2556 or 1206×2622); "iPad 13-inch display" (2064×2752 or 2048×2732) if the app runs on iPad | | `store/screenshots/ios/` | https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications |
| A11 | Listing text within limits | | `store/listing.ios.json` | https://developer.apple.com/help/app-store-connect/reference/app-information/app-information |
| A12 | Privacy policy URL in App Store Connect and inside the app (5.1.1(i)) | | <url>, opened <date>: HTTP <status> | https://developer.apple.com/app-store/review/guidelines/ |
| A13 | Support URL works; contact info accurate (1.5) | | <url>, opened <date>: HTTP <status> | https://developer.apple.com/app-store/review/guidelines/ |
| A14 | Review notes with a demo account for every role (4,000 bytes) | | `store/review-notes.txt` | https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review |
| A15 | In-app account deletion, if the app has accounts | | | https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion |
| A16 | App icon 1024×1024 | | | Human Interface Guidelines, App icons |
| A17 | Tested on iPad, even if `supportsTablet` is false | | | https://docs.expo.dev/distribution/app-stores/ |
| A18 | TestFlight build uploaded; Beta App Review passed for external testers | | | https://developer.apple.com/testflight/ |

## Google Play

| # | Item | Status | Evidence or next step | Source |
|---|---|---|---|---|
| G1 | Developer account ($25 one-time) | | | https://support.google.com/googleplay/android-developer/answer/10841920 |
| G2 | Android developer verification (registered when the app is created in Play Console) | | | https://developer.android.com/developer-verification |
| G3 | App created in Play Console | | | https://docs.expo.dev/submit/android/ |
| G4 | Package name set | | | app config |
| G5 | New versionCode for this upload | | | https://docs.expo.dev/submit/introduction/ |
| G6 | Target API 36 (Wear OS/Automotive 35, TV/XR 34) | | | https://developer.android.com/google/play/requirements/target-sdk |
| G7 | Android App Bundle (.aab) | | | https://developer.android.com/guide/app-bundle |
| G8 | Play App Signing; upload key kept safe | | | https://developer.android.com/studio/publish/app-signing |
| G8a | 16 KB page sizes: native libraries in the release build are 16 KB aligned (required for updates from 2027-02-01) | | <how it was checked> | https://developer.android.com/guide/practices/page-sizes |
| G9 | Data safety form, including SDK data | | `store/data-safety.android.md` | https://support.google.com/googleplay/android-developer/answer/10787469 |
| G10 | Permission declarations | | `store/data-safety.android.md` | play-data-safety skill |
| G11 | Content rating (IARC) | | `store/age-rating.md` | https://support.google.com/googleplay/android-developer/answer/9898843 |
| G11a | Ads declaration (including ads from SDKs) | | `store/age-rating.md` | https://support.google.com/googleplay/android-developer/answer/9859455 |
| G11b | Target audience and content (target age groups; Families policy if under 13) | | `store/age-rating.md` | https://support.google.com/googleplay/android-developer/answer/9867159 |
| G12 | App access / sign-in details | | `store/app-access.android.txt` | https://support.google.com/googleplay/android-developer/answer/9859455 |
| G13 | Account deletion: in-app path and web link (the link must load; offline-only accounts are out of policy scope) | | <in-app path>; <url>, opened <date>: HTTP <status> | https://support.google.com/googleplay/android-developer/answer/13327111 |
| G14 | Privacy policy URL | | <url>, opened <date>: HTTP <status> | https://support.google.com/googleplay/android-developer/answer/10787469 |
| G15 | Listing text within limits | | `store/listing.android.json` | https://support.google.com/googleplay/android-developer/answer/9859152 |
| G16 | Icon 512×512, feature graphic 1024×500, 2+ phone screenshots | | `store/screenshots/android/` | https://support.google.com/googleplay/android-developer/answer/1078870 |

## Build and submit (EAS)

| # | Item | Status | Evidence or next step | Source |
|---|---|---|---|---|
| E1 | `eas.json` has development, preview and production profiles | | | https://docs.expo.dev/build/eas-json/ |
| E2 | Credentials: Android keystore and iOS certificates managed by EAS or `credentials.json` | | | https://docs.expo.dev/app-signing/security/ |
| E3 | Google service account key available to EAS, not committed | | | https://docs.expo.dev/submit/android/ |
| E4 | App Store Connect API key for CI (Account Holder or Admin) | | | https://docs.expo.dev/submit/introduction/ |
| E5 | Version and build number increment confirmed | | | https://docs.expo.dev/submit/introduction/ |
| E6 | `eas build -p all --profile production` | | | https://docs.expo.dev/build/setup/ |
| E7 | `eas submit -p android` to the internal track with `releaseStatus: "draft"` | | | https://docs.expo.dev/submit/android/ |
| E8 | `eas submit -p ios` to App Store Connect / TestFlight | | | https://docs.expo.dev/submit/testflight/ |
| E9 | Builds left this month on the free plan (15 Android, 15 iOS) | | | https://expo.dev/pricing |

## Next three actions
1. <the first `todo` or `user` item in the order above, with who does it>
2.
3.
