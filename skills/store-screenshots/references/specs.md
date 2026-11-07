# Screenshot specifications

Copied from `docs/sources/apple.md` and `docs/sources/google-play.md` in the store-ready repo; Apple's screenshot page re-checked 2026-11-07. If the store page lists something different, the store page wins: use it, add the size to `IOS_CLASSES` in `scripts/check-sizes.mjs` if needed, and report the difference.

## Apple App Store

Source: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications

Apple names iPhone display classes, not inches. Sizes are portrait; the landscape equivalent (the same pair swapped) is also accepted.

| Display class | Accepted sizes (portrait) | Status |
|---|---|---|
| iPhone with Dynamic Island (medium display) | 1179×2556, 1206×2622 | **Required**: at least one screenshot |
| iPad 13-inch display | 2064×2752, 2048×2732 | **Required if the app runs on iPad** |
| iPhone with Dynamic Island (large display) | 1260×2736, 1290×2796, 1320×2868 | Optional |
| iPhone with Face ID (large display) | 1284×2778, 1242×2688 | Optional |
| iPhone with Face ID (medium display) | 1170×2532, 1125×2436, 1080×2340 | Optional |
| iPhone with Home Button (large display) | 1242×2208 | Optional |
| iPhone with Home Button (medium display) | 750×1334 | Optional |
| iPad 11-inch display | 1488×2266, 1512×2316, 1668×2420, 1668×2388, 1640×2360 | Optional |
| iPad 12.9-inch display | 2048×2732 | Optional (same pixels as a 13-inch size; the checker counts it as 13-inch) |
| iPad 10.5-inch display | 1668×2224 | Optional |
| iPhone Duo, outer display | 1398×2034 | Required from April 2027 for apps built with the iOS 27.1 SDK or later |
| iPhone Duo, inner display | 2007×2853 | Required from April 2027 for apps built with the iOS 27.1 SDK or later |

Apple's page lists the devices in the required class as iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15 and 14 Pro.

- 1 to 10 screenshots per device size.
- .jpeg, .jpg or .png. Apple: "Images can't include alpha channels or transparencies."
- For iPhone Duo, Apple's news post (https://developer.apple.com/news/?id=kkphp5qo) says "all submissions"; the specification page and the post differ, so read both before planning a 2027 release.

### Folders

```
store/screenshots/ios/iphone/   images of any iPhone class
store/screenshots/ios/ipad/     images of any iPad class
```

`check-sizes.mjs` classifies iOS images by pixel size, not by folder name, and checks that each required class is present somewhere under `ios/`. It counts the 1–10 limit per display class.

The required classes are the minimum. Capture the required iPhone class (and iPad 13-inch if the app runs on iPad); add other classes only if the user wants device-specific screenshots. This file does not say how App Store Connect uses the required class for other devices; read the specification page if that matters to the user.

### Guideline 2.3.3 Screenshots

Source: https://developer.apple.com/help/app-review/guideline-reference/2-3-3-screenshots

- Rejected: splash screens, login screens or title art as the screenshot, outdated UI, and overlays that hide the UI.
- Required: more than half of the screenshots for each device size must show the app in use.

### Guideline 2.3.14 Creative Assets

Source: https://developer.apple.com/news/?id=92th7e5i (guideline added 2026-10-16)

Creative assets must be relevant to the app or brand, suitable for all audiences, and contain no pricing and no unverifiable claims. This applies to captions and any art around the screenshot.

### Guideline 2.3.10

Source: https://developer.apple.com/app-store/review/guidelines/

No other platforms' names or imagery. Do not show an Android device frame, Android status bar or Play badges in App Store screenshots.

## Google Play

Source: https://support.google.com/googleplay/android-developer/answer/1078870

| Asset | Folder | Rule |
|---|---|---|
| Screenshots | `android/phone`, `android/tablet` | At least 2 to publish, up to 8 per device type. JPEG or 24-bit PNG (no alpha). Each side 320–3840 px. Longest side at most twice the shortest. |
| Promotion eligibility | same | At least 4 screenshots at 1080 px or more. `check-sizes.mjs` counts screenshots whose shorter side is at least 1080 px. |
| Feature graphic | `android/feature-graphic` | 1024×500, JPEG or 24-bit PNG, no alpha. |
| App icon | `android/icon` | 512×512, 32-bit PNG with alpha, up to 1024 KB. |
| Video | not a file | Optional. A public or unlisted YouTube URL with ads off. |

Play Console takes screenshots per device type. Our sources do not list the types. store-ready uses `android/phone` and `android/tablet`; if the Console offers another device type the app needs, add a folder for it (the checker warns about the unknown name but checks the images).

### The aspect-ratio trap

Many current Android phones and emulator device profiles are taller than 2:1 (a 1080×2400 screen is 2.22:1). A raw screenshot from one fails Play's "longest side at most twice the shortest" rule. Capture on a device profile at 2:1 or squarer (1080×1920 or 1080×2160), or crop to that ratio without cutting off UI.

## Pixel arithmetic for web capture

These are the accepted sizes divided by a whole-number scale factor. They are arithmetic, not store rules.

| Target | CSS viewport | Scale factor |
|---|---|---|
| iPhone Dynamic Island (medium) 1206×2622 | 402×874 | 3 |
| iPhone Dynamic Island (medium) 1179×2556 | 393×852 | 3 |
| iPhone Dynamic Island (large) 1320×2868 | 440×956 | 3 |
| iPad 13-inch 2064×2752 | 1032×1376 | 2 |
| iPad 13-inch 2048×2732 | 1024×1366 | 2 |
| Play phone 1080×1920 | 360×640 | 3 |
| Play phone 1080×2160 | 360×720 | 3 |
| Play feature graphic 1024×500 | 1024×500 | 1 |
