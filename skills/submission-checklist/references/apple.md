# Apple: submission requirements outside the code

Copied from `docs/sources/` in the store-ready repo, checked 2026-11-07. Where a fact is not in our sources, the entry says so and gives the page to read.

## Accounts and agreements

| Item | Fact | Source |
|---|---|---|
| Apple Developer Program | Store release builds on iOS need the Apple Developer Program, $99/year. | https://docs.expo.dev/build/setup/ |
| App Store Connect app record | `eas submit` creates the App Store Connect app if it is missing. | https://docs.expo.dev/submit/introduction/ |
| App Store Connect API key | CI submissions need an App Store Connect API key with the Account Holder or Admin role. | https://docs.expo.dev/submit/introduction/ |

## Build requirements

| Item | Fact | Source |
|---|---|---|
| Xcode and SDK | Since 2026-04-28, uploads must be built with Xcode 26 or later and the 26 SDKs. | https://developer.apple.com/news/upcoming-requirements/ |
| Minimum OS | Since 2026-09-09, apps must target iOS 13 or later. | https://developer.apple.com/news/upcoming-requirements/ |
| Next SDK | From April 2027, the iOS 27 SDK (Xcode 27) is required. | https://developer.apple.com/news/?id=k1mtkt1k |
| Expo SDK 58 | Supports iOS 16.4+ and Xcode 26.4+. | https://docs.expo.dev/versions/latest/ |
| EAS build images | EAS cloud builds run on Expo's macOS images. Which Xcode each image uses is listed on the build infrastructure page; read it rather than assuming. | https://docs.expo.dev/build-reference/infrastructure/ |
| Build numbers | Every upload needs a new build number. | https://docs.expo.dev/submit/introduction/ |

## Compliance declarations

| Item | Fact | Source |
|---|---|---|
| Export compliance | Asked on each submission. The Info.plist key `ITSAppUsesNonExemptEncryption` answers it in the build so the question is skipped. France has separate rules. Whether the app's encryption is exempt is a legal answer: read the page, and ask the user if the app does anything beyond standard OS networking. | https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance |
| Export compliance in Expo | `ios.config.usesNonExemptEncryption` in the app config sets `ITSAppUsesNonExemptEncryption`; `ios.infoPlist` can set Info.plist keys directly. | https://docs.expo.dev/versions/latest/config/app/ |
| EU Digital Services Act trader status | Must be declared even if the app is not distributed in the EU. Apps without it have been removed from the EU storefronts since 2025-02-17. Traders must provide a verified address, phone number and email. How Apple decides who is a trader is **not in our sources**: read the factors and examples on the page before suggesting an answer, and let the user decide. | https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements |
| Regulated medical device | Health and medical apps declare regulated medical device status for the EU, UK and US. | https://developer.apple.com/news/?id=nyqbfz1y |
| Regulated fields | Banking, health, gambling, crypto exchanges and air travel apps must be submitted by the legal entity, not an individual (5.1.1(ix)). | https://developer.apple.com/app-store/review/guidelines/ |

## App Store Connect metadata

| Item | Fact | Source |
|---|---|---|
| App Privacy | Required for new apps and updates; must include data collected by third-party SDKs; can be updated without a new build. | https://developer.apple.com/app-store/app-privacy-details/ |
| expo-updates and App Privacy | Apps using expo-updates should answer "Yes" and select Crash Data. | https://docs.expo.dev/guides/apple-privacy/ |
| Privacy manifest | Required-reason API declarations enforced at upload since 2024-05-01. | https://developer.apple.com/support/third-party-SDK-requirements/ |
| Age rating | Tiers 4+, 9+, 13+, 16+, 18+. Social-media capability questions required from September 2026. Shared Location and Dating & Relationships descriptors required on submissions from 2026-11-16, all apps by 2027-01-12. | https://developer.apple.com/news/?id=tlur8uvi, https://developer.apple.com/news/?id=yxkh08us |
| Screenshots | Apple names display classes, not inches. Required: at least one "iPhone with Dynamic Island (medium display)" screenshot, 1179×2556 or 1206×2622; "iPad 13-inch display", 2064×2752 or 2048×2732, if the app runs on iPad. Other classes optional. 1–10 per device size, no alpha or transparency. | https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications |
| App icon | 1024×1024, square, unmasked. | Human Interface Guidelines, App icons |
| Privacy policy | Link it in App Store Connect metadata and inside the app (5.1.1(i)). | https://developer.apple.com/app-store/review/guidelines/ |
| Support URL and contact | Accurate contact information in the app and a working Support URL (1.5). | https://developer.apple.com/app-store/review/guidelines/ |
| Review notes | 4,000 bytes; demo account for every role. | https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review |
| iPad | Test on iPad even if `supportsTablet` is false. | https://docs.expo.dev/distribution/app-stores/ |

## TestFlight

| Fact | Source |
|---|---|
| Up to 10,000 external testers. | Apple; confirm at https://developer.apple.com/testflight/ |
| The first build of a version needs Beta App Review before external testers get it. | Apple; confirm at https://developer.apple.com/testflight/ |
| At most 6 review submissions per 24 hours. | Apple; confirm at https://developer.apple.com/testflight/ |
| `eas submit -p ios` uploads a build to App Store Connect for TestFlight, from Windows, macOS or Linux. | https://docs.expo.dev/submit/testflight/ |
| A build's expiry period is **not confirmed** in our sources. | https://developer.apple.com/testflight/ |

For internal testers, beta app description and beta review information, read https://developer.apple.com/testflight/.

## Review timing

50% of submissions are reviewed in under 24 hours and 90% in under 48 hours (https://developer.apple.com/distribute/app-review/). Plan for a rejection round anyway.
