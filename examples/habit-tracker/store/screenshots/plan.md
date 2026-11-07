# Screenshot plan

Sets: ios/iphone (Dynamic Island medium, 1206x2622), ios/ipad (13-inch, 2064x2752; required because `ios.supportsTablet` is true), android/phone (1080x2160, 2:1), android/feature-graphic (1024x500), android/icon (512x512)
Capture method: Expo web (`npx expo export --platform web`, `dist/` served locally) rendered by headless Chrome 156 through the DevTools protocol at the exact CSS viewport and device scale factor: iPhone 402x874 at 3x, iPad 1032x1376 at 2x, Play phone 360x720 at 3x. PNGs flattened to 24-bit RGB. Not yet checked against native; see "Compare against native" below.

| # | Screen | Route or file | State to set up | Caption |
|---|---|---|---|---|
| 01 | Today list | `src/app/index.tsx` | Signed in as reviewer@storeready.dev; 5 habits, 3 checked today, streaks 12, 23, 5, 3, 0 | none |
| 02 | Habit with a photo | `src/app/habit/[id].tsx` | "Morning walk": photo attached, current 12, best 12, 18 check-ins, done today | none |
| 03 | Habit streak stats | `src/app/habit/[id].tsx` | "Read 10 pages": no photo (initial shown), 23-day streak, done today | none |
| 04 | Settings | `src/app/settings.tsx` | Same account; shows Delete account, Privacy policy, Help and support | none |

Shows the app in use: 01, 02, 03, 04 (4 of 4 per set)

No captions: none are needed, so no 2.3.14 caption text to check.

Demo data: invented habit names and dates. The habit photo is an illustration drawn in HTML/CSS for this capture (no stock or third-party image). State was seeded into the web build's local storage before each capture; nothing was added to the app's code.

Feature graphic: app icon, the name "Streaks" and "Check off daily habits and keep each streak going" on the icon's orange gradient. No prices, rankings or claims.

Play icon: `assets/images/icon.png` scaled to 512x512, 32-bit PNG.

## Compare against native before upload

These come from the web build. Expected differences on a device:

- iOS headers show a "Today" back button on 02 to 04 on a device; the iOS and iPad web captures were opened by URL, so the header has no back button. The Android captures were reached by tapping through the app and show the back arrow.
- No status bar or safe-area inset on web. A device capture shows the clock and notch area at the top.
- System font: the web build renders in Segoe UI on Windows; the device uses San Francisco (iOS) or Roboto (Android).
- On iOS the sign-in screen also shows "Continue with Apple"; it is not in any screenshot.

Replace any image that differs in a way a user would notice. Better: capture the same four screens on an iPhone 16 or 17 class device (1206x2622), an iPad 13-inch, and an Android phone or emulator with a 1080x2160 profile, using the same demo data.

## Upload

- App Store Connect: the version's media, in the slot for "iPhone with Dynamic Island (medium display)" (1206x2622) and "iPad 13-inch display" (2064x2752).
- Play Console: Main store listing > Phone screenshots (4), Feature graphic, App icon.
