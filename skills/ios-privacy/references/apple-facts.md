# Facts this skill relies on

Copied from `docs/sources/apple.md` and `docs/sources/expo.md` (checked 2026-11-07). Each fact has its source. If you need something that is not here, open the linked page and read it; do not fill the gap from memory.

## App Review Guidelines

Guidelines page: https://developer.apple.com/app-store/review/guidelines/ (shows "Last Updated: October 16, 2026").

| Guideline | What gets rejected | What fixes it | Source |
|---|---|---|---|
| 5.1.1(i) | Missing privacy policy | Link it in App Store Connect metadata and inside the app | guidelines page |
| 5.1.1(ii) | Vague permission purpose strings | Say what the data is used for, with an example | https://developer.apple.com/help/app-review/guideline-reference/5-1-1-purpose-strings |
| 5.1.2(i) | Sharing data (including with AI providers) without consent; forcing push, location or tracking permission to use the app | Disclose and get explicit permission; the app must work without optional permissions | guidelines page |

- 2025-11-13: 5.1.2(i) now requires disclosing sharing with third-party AI and getting explicit permission. https://developer.apple.com/news/?id=ey6d8onl

## App Privacy details (App Store Connect)

Source: https://developer.apple.com/app-store/app-privacy-details/

- Required for new apps and for updates.
- Must include data collected by third-party SDKs in the app.
- Can be updated without a new build.

The data types, purposes and questions App Store Connect asks are defined on that page. Read it before filling `store/privacy.ios.md`; use its names exactly.

What counts as "collected", including data that is processed only on the device and never sent, is defined on that page too. Our sources do not quote it. For a local-first app it decides most answers: read it there and cite the page in "Not collected".

## Privacy manifest (PrivacyInfo.xcprivacy)

Source: `docs/sources/apple.md`, with Apple's third-party SDK list at https://developer.apple.com/support/third-party-SDK-requirements/

- Required-reason API declarations have been enforced at upload since 2024-05-01.
- Each executable and each listed SDK needs its own manifest.
- 86 SDKs listed at https://developer.apple.com/support/third-party-SDK-requirements/ need a manifest and a signature when shipped as binaries.
- Categories and the reason codes Apple accepts:

| Category | Manifest value | Reason codes |
|---|---|---|
| File timestamp | `NSPrivacyAccessedAPICategoryFileTimestamp` | DDA9.1, C617.1, 3B52.1, 0A2A.1 |
| System boot time | `NSPrivacyAccessedAPICategorySystemBootTime` | 35F9.1, 8FFB.1, 3D61.1 |
| Disk space | `NSPrivacyAccessedAPICategoryDiskSpace` | 85F4.1, E174.1, 7D9E.1, B728.1 |
| Active keyboards | `NSPrivacyAccessedAPICategoryActiveKeyboards` | 3EC4.1, 54BD.1 |
| User defaults | `NSPrivacyAccessedAPICategoryUserDefaults` | CA92.1, 1C8F.1, C56D.1, AC6B.1 |

- What each code means is not in our sources. Read https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api (linked from Expo's privacy guide) before choosing a code for the app's own code.
- The `NSPrivacyAccessedAPICategoryUserDefaults` value and the `CA92.1` example come from Expo's guide, https://docs.expo.dev/guides/apple-privacy/. The other four values follow the same pattern; confirm them on Apple's page above if a build complains.
- The error code ITMS-91053 is **unconfirmed** in our sources. Do not quote it to the user as the code Apple sends; quote the email they received.

## Expo

Sources: https://docs.expo.dev/guides/apple-privacy/, https://docs.expo.dev/distribution/app-stores/

- Set required reasons in `expo.ios.privacyManifests.NSPrivacyAccessedAPITypes`, an array of entries with `NSPrivacyAccessedAPIType` and `NSPrivacyAccessedAPITypeReasons` (for example UserDefaults with `CA92.1`).
- Expo SDK packages ship their own PrivacyInfo files, but Apple may not read them from static CocoaPods, so copy the reasons into app config.
- Apple emails missing reasons after upload.
- Apps using expo-updates should answer "Yes" and select Crash Data in App Privacy.
- A privacy policy is required.

App config keys used by this skill (verified on Expo docs 2026-11-07, not yet recorded in `docs/sources/expo.md`):

- `ios.infoPlist`: dictionary added to the app's Info.plist; Expo's example sets `NSCameraUsageDescription` there. https://docs.expo.dev/guides/permissions/
- `ios.privacyManifests`: privacy manifest definitions added to the app's PrivacyInfo.xcprivacy. https://docs.expo.dev/versions/latest/config/app/
