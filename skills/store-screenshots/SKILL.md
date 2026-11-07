---
name: store-screenshots
description: Plans, captures and validates App Store screenshots and Google Play screenshots for a mobile app - required screenshot sizes (iPhone with Dynamic Island medium display, iPad 13-inch display, Play phone and tablet), counts, PNG/JPEG without alpha, the Play feature graphic 1024x500, and Apple's rule that most screenshots show the app in use. Use when the user asks about App Store screenshots, Play Store screenshots, screenshot sizes, screenshot dimensions, "what size screenshots do I need", a feature graphic, captions on screenshots, capturing from the simulator, emulator or Expo web, or after a guideline 2.3.3 rejection. Produces store/screenshots/plan.md and images under store/screenshots/ios/{iphone,ipad}/ and store/screenshots/android/{phone,tablet,feature-graphic,icon}/, checked by a no-dependency size checker.
license: MIT
---

# store-screenshots

Use this skill when the app needs screenshots for App Store Connect or Play Console, when existing screenshots were rejected, or when the user is unsure which sizes to make.

It produces, in the user's project:

- `store/screenshots/plan.md`: which screens, in what order, with captions and the state to set up for each.
- Images under `store/screenshots/ios/{iphone,ipad}/` and `store/screenshots/android/{phone,tablet,feature-graphic,icon}/`, named `01-<screen>.png`, `02-<screen>.png`, ... so the order is the upload order.
- A clean run of `scripts/check-sizes.mjs`.
- When capturing from web: `store/screenshots/capture.json` (and an optional seed file next to it), the plan `scripts/capture.mjs` runs, so the set can be re-captured after UI changes.

Sizes, counts and formats, each with its source URL, are in [references/specs.md](references/specs.md). Capture methods and their limits are in [references/capture.md](references/capture.md). Read both.

## 1. Find out which sets are needed

From the project:

- iOS: at least one screenshot in Apple's "iPhone with Dynamic Island (medium display)" class (1179×2556 or 1206×2622) is always required. Apple names display classes, not inches. An "iPad 13-inch display" screenshot (2064×2752 or 2048×2732) is required if the app runs on iPad. Other classes are optional. In Expo, that is `ios.supportsTablet: true` in the app config; in a native project, the target's device family includes iPad. Expo's own guidance is to test on iPad even when `supportsTablet` is false (https://docs.expo.dev/distribution/app-stores/), so look at the iPad layout either way.
- Android: a phone set (at least 2, up to 8). A tablet set if the app supports tablets and the user wants them listed. A feature graphic (1024×500).

Folder layout:

```
store/screenshots/
  plan.md
  ios/iphone/01-<screen>.png
  ios/ipad/01-<screen>.png
  android/phone/01-<screen>.png
  android/tablet/01-<screen>.png
  android/feature-graphic/feature-graphic.png
  android/icon/icon.png
```

The checker classifies iOS images by pixel size, so one folder per device family is enough. If the user wants screenshots for an optional class too (for example 1320×2868 for Dynamic Island large), put them in the same folder; Apple counts 1 to 10 per device size.

Use PNG unless the user has JPEGs already. Both stores reject alpha in screenshots, so export PNGs as RGB.

## 2. Write the capture plan

Read the app's screens and navigation (the router directory, navigator definitions, or the feature inventory from the store-listing skill if it exists). Choose the screens that tell the app's story in the order a new user would care about it:

1. The core action: the screen where the user does the main thing (checks off a habit, logs a meal, scans a document).
2. The result: what the user gets from doing it (a streak chart, a summary, the exported file).
3. Two to four secondary features, one per screenshot, each a real screen.
4. Optionally, personalization or a key setting, if it is a reason to install.

Rules for the plan:

- More than half of the screenshots for each device size must show the app in use (2.3.3). Do not plan a splash screen, a login screen, an onboarding slide or title art as a screenshot. Aim for every screenshot showing the app in use.
- Do not lead with a paywall. If a subscription feature is shown, show the feature, not the purchase sheet.
- Every screen in the plan must exist in the current build. No mockups of planned features.
- Plan 4 to 8 per set: Apple allows 1 to 10, Play requires at least 2 and allows up to 8, and Play promotion eligibility needs at least 4 at 1080 px or more.
- Use the same screens in the same order for every set, so the listing reads the same on each device.

Captions, if used: under about six words, start with a verb, say what the user does on that screen, and match it. No prices, ratings, awards, superlatives or "#1" (2.3.14). No other platform's name (2.3.10).

Write `store/screenshots/plan.md`:

```markdown
# Screenshot plan

Sets: ios/iphone (Dynamic Island medium, 1206x2622), ios/ipad (13-inch, 2064x2752), android/phone, android/feature-graphic
Capture method: <iOS Simulator | device | Android emulator | Expo web (checked against native)>

| # | Screen | Route or file | State to set up | Caption |
|---|---|---|---|---|
| 01 | Today list | app/(tabs)/index.tsx | 5 habits, 3 checked | Check off today's habits |
| 02 | Streak chart | app/habit/[id].tsx | 6-week history | See every streak |
| ... |

Shows the app in use: 01, 02, 03, 04, 05 (5 of 5)
```

Show the plan to the user before capturing. It is quick to change now and slow to change after.

## 3. Capture

Use the first method in [references/capture.md](references/capture.md) that is available on this machine:

1. iOS Simulator (Mac with Xcode only).
2. A real device the user owns, with an internal or TestFlight build. You ask; the user captures.
3. Android emulator with a 2:1 or squarer device profile.
4. Expo web rendered at the exact pixel size with `scripts/capture.mjs`, as a fallback. It drives a locally installed Chrome or Edge, headless, over the DevTools protocol: it sets the viewport and scale, seeds `localStorage` (so it can get past sign-in without changing app code), opens routes, taps by selector or label, and saves RGB PNGs without alpha. Needs Node 22+; on older Node it prints what to do instead. Plan format and a worked example: [references/capture.md](references/capture.md).

Two traps to avoid:

- **Play's aspect rule.** Play rejects a screenshot whose longest side is more than twice its shortest. Many current Android device profiles are taller than that (1080×2400 is 2.22:1). Capture on a 1080×1920 or 1080×2160 profile, or crop.
- **Web is not native.** Web renders differ from native in fonts, native controls, safe areas, the status bar, maps, camera and any `Platform.OS` branch. If you capture from web, tell the user, and compare every image against the native build before it is uploaded. Replace any that differ in a way a user would notice.
- **Android-style back arrows in iOS shots.** On web, React Navigation's stack header draws a Material back arrow. Reaching a screen by tapping through gives iOS screenshots an Android arrow (another platform's imagery, 2.3.10); opening the route by URL gives no back button at all. For iOS sets, open each screen by `route`; tapping through is fine for Android sets. Say which you did in the plan.
- **iPad from a phone layout.** If the app caps its content width (for example 640 px), the iPad 13-inch shots show a narrow column in a wide screen. Our sources set no rule on this; show the user one iPad image before capturing the rest and let them decide whether the iPad layout needs work.

Render at the exact size; do not upscale a smaller capture.

The feature graphic is not a screenshot. Make it as a plain HTML page at 1024×500 (app name, one short line, colors from the app icon), capture it with `capture.mjs` at size `1024x500`, and keep text clear of the edges. Hold it to the same text rules as the captions: no prices, rankings or unverifiable claims. Play's own rules for listing graphics sit under Store Listing and Promotion in the Developer Program Policy (https://play.google/developer-content-policy/). If the icon you are about to reuse is template or default artwork, stop and send it to `app-review-risk` (area A9) before making any graphic from it.

## 4. Check

Run from the project root:

```
node <this-skill>/scripts/check-sizes.mjs
```

`<this-skill>` is the folder that contains this SKILL.md. Replace it with that folder's full path before running the command; never type `<this-skill>` into a shell, and do not assume the skill sits inside the user's project. Most agents show the folder when they load a skill. If yours does not, search the installed skills for the script's file name.

Add `--ipad` when the app runs on iPad, so a missing iPad 13-inch screenshot is an error. Pass a project path as the first argument to check another folder.

The script reads PNG and JPEG headers directly and reports, per file: pixel size, format, color type, whether it has alpha, and for iOS the Apple display class the size belongs to. It fails on:

- iOS images whose size is in no accepted class (it lists the closest accepted sizes), alpha or transparency, more than 10 in one display class, no image in the "iPhone with Dynamic Island (medium display)" class, and no "iPad 13-inch display" image with `--ipad`.
- Play screenshots with a side outside 320–3840 px, an aspect over 2:1, alpha, more than 8 per device type, fewer than 2 in total; a feature graphic that is not exactly 1024×500 or has alpha; an icon that is not a 512×512 PNG up to 1024 KB.
- Any file that is not PNG or JPEG.

It warns on PNGs that are not 24-bit RGB (Play asks for 24-bit), extensions that do not match the content, unknown folders, iOS images in the wrong device folder, iPhone Duo sizes (required from April 2027; check that App Store Connect takes them now), and fewer than 4 Play screenshots at 1080 px or more.

Fix alpha by flattening onto an opaque background and re-exporting as RGB. Fix size by re-capturing at the right viewport or device, not by stretching.

If Apple's specification page accepts a size the script rejects, the page is right: add the size to `IOS_CLASSES` at the top of the script and tell the user.

## 5. Report

Tell the user:

- Which folders exist, how many images each has, and which Apple display classes the checker found.
- Which capture method was used for each set, and which images came from web and still need comparing against native.
- That 2.3.3 ("more than half show the app in use") was checked by reading the plan and looking at each image, since a script cannot check it.
- Where to upload: App Store Connect, the version's media for each device size; Play Console, the main store listing graphics.

## Verify

- [ ] `node <this-skill>/scripts/check-sizes.mjs` (with `--ipad` if the app runs on iPad) exits 0, and you have read every warning.
- [ ] Open every image. None is a splash, login, onboarding-only or title-art screen; for each device size, more than half show the app in use.
- [ ] Every screenshot shows a screen that exists in the current build, with realistic demo data and no debug UI.
- [ ] No caption has a price, rating, superlative or another platform's name.
- [ ] Android screenshots are 2:1 or squarer.
- [ ] `store/screenshots/plan.md` lists every image, in upload order, with its capture method.
- [ ] Web captures: no iOS image shows an Android-style back arrow; `capture.json` re-runs cleanly (`node <this-skill>/scripts/capture.mjs store/screenshots/capture.json` exits 0).
- [ ] If the project has the store-ready checker, `npx store-ready check` reports no screenshot errors.
