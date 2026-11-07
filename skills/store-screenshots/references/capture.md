# Capturing screenshots

Pick the first method that is available. Native captures show exactly what the reviewer will see; web captures are a fallback that must be checked against a native build.

Whatever the method, run `scripts/check-sizes.mjs` after every capture session. It is the only reliable check that the pixel size and alpha are right.

## Before any capture: set up the state

- Seed realistic demo data: real-looking names, dates and numbers, no "Lorem ipsum", no "Test User 1", no "asdf". Placeholder content is a 2.1 rejection trigger (https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review).
- Do not show real people's personal data. Use invented names and stock-free content you have rights to.
- Use the release build or a build with the same UI. No debug overlays, dev menus, error toasts, or "DEV" badges.
- Use a fixed time and full battery in the status bar if the platform lets you. It reads as finished; a 2% battery icon reads as a test.
- Use light mode unless the app is dark-only, and keep it the same across a set.

## 1. iOS Simulator (needs a Mac with Xcode)

1. Run the app on a simulator in the required "iPhone with Dynamic Island (medium display)" class; `specs.md` lists the devices Apple names for it. Check the size after the first capture with the checker; do not trust the device name.
2. Optionally clean the status bar: `xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100`.
3. Capture: `xcrun simctl io booted screenshot store/screenshots/ios/iphone/01-<screen>.png`.
4. Repeat on an iPad simulator with an "iPad 13-inch display" size if the app runs on iPad, saving to `store/screenshots/ios/ipad/`.

From Windows or Linux there is no simulator. `npx expo run:ios` needs a Mac with Xcode (https://docs.expo.dev/build-reference/local-builds/, https://docs.expo.dev/submit/testflight/). Use method 2 or 4.

## 2. A real device

A screenshot taken on a phone is the phone's native resolution. If the user has an iPhone or iPad whose screen matches an accepted size, install a TestFlight or internal build (cloud `eas build` works from any OS) and take screenshots on the device, then copy the files into the right folder. Ask the user for this; you cannot do it yourself.

## 3. Android emulator

Setup on Windows: https://docs.expo.dev/workflow/android-studio-emulator/ (JDK 17, Android Studio with SDK Platform 36, `ANDROID_HOME`, an AVD, `npx expo start` then press `a`).

1. Create an AVD with a 2:1 or squarer screen: a hardware profile of 1080×1920 or 1080×2160. Taller default profiles fail Play's aspect rule (see `specs.md`).
2. Capture to the device, then pull the file. Do not redirect binary output through PowerShell (`>`), which re-encodes it and corrupts the PNG:
   ```
   adb shell screencap -p /sdcard/shot.png
   adb pull /sdcard/shot.png store/screenshots/android/phone/01-<screen>.png
   ```
3. Repeat for each screen.

## 4. Expo web, rendered at device scale (fallback)

Use only when no simulator, emulator or device is available, and tell the user which screenshots came from web.

Web renders differ from native. Expect differences in: system fonts, native controls (switches, pickers, date pickers, action sheets, alerts), tab bar and header blur, safe-area insets and the status bar (absent on web), maps, camera, video, and any code behind `Platform.OS` checks. A screenshot that does not match the shipped app is the "outdated UI" or inaccurate-metadata problem 2.3.3 and 2.3.1(a) reject. Every web screenshot must be compared against the native build on a device or emulator before upload; if it differs in anything a user would notice, replace it.

1. Start the web build: `npx expo start --web` (the dev server answers deep links such as `/habit/1`). A static export (`npx expo export -p web`) needs a server that serves those routes too.
2. Find what the app keeps in `localStorage` on web (AsyncStorage's web build stores there; confirm by reading the store code, or by using the app in a normal browser and looking at its storage). Note the keys and value shapes, then write a seed file with realistic demo data, for example `store/screenshots/seed.json`:
   ```json
   { "session": { "userId": "u1", "email": "sam@demo.app" }, "habits:u1": [{ "id": "1", "name": "Read 20 pages" }] }
   ```
   Values that are not strings are written with `JSON.stringify`, which is what most apps read back. Only `localStorage` is seeded; IndexedDB and cookies are not.
3. Write `store/screenshots/capture.json`:
   ```json
   {
     "baseUrl": "http://localhost:8081",
     "background": "#ffffff",
     "seed": "seed.json",
     "sets": [
       { "name": "iphone", "out": "store/screenshots/ios/iphone", "size": "1206x2622" },
       { "name": "ipad", "out": "store/screenshots/ios/ipad", "size": "2064x2752" },
       { "name": "android", "out": "store/screenshots/android/phone", "size": "1080x2160" }
     ],
     "shots": [
       { "file": "01-today.png", "route": "/", "waitFor": "text=Today" },
       { "file": "02-habit.png", "route": "/habit/1", "sets": ["iphone", "ipad"] },
       { "file": "02-habit.png", "route": "/", "click": ["text=Read 20 pages"], "sets": ["android"] }
     ]
   }
   ```
   `size` is one of the sizes in the pixel table in `specs.md` (or give `width`, `height` and `scale`). A shot opens `baseUrl + route` (omit `route` to stay on the current screen), taps each `click` target in order (a CSS selector such as `[data-testid="save"]`, which is what `testID` becomes on web, or `text=` plus the exact visible label), waits for `waitFor`, then waits `delay` ms (default 500) and captures. `sets` limits a shot to some sets; `reseed: true` restores the seed before that shot. Every set starts in a fresh tab with storage cleared and seeded before the app's code runs.
4. Run it from the project root:
   ```
   node <this-skill>/scripts/capture.mjs store/screenshots/capture.json
   ```
   It finds Chrome or Edge in the standard install folders (or use `--browser <path>` or `CHROME_PATH`) and exits 2 with a message if there is none. `--only iphone` re-captures one set. It paints an opaque `background` behind the page, captures the viewport with `captureBeyondViewport`, checks the pixel size, and writes 8-bit RGB PNGs with no alpha channel. `node <this-skill>/scripts/capture.mjs --flatten <file.png>` does the same flattening for an existing PNG (for example a feature graphic), on Node 20 too.
5. Run `check-sizes.mjs`, then open every image. If the size is wrong, fix the viewport or scale; do not resize the image.

Web against native, beyond the list above:
- React Navigation draws a Material back arrow on web. Tapping into a screen puts that arrow in the header, which in an iOS screenshot is another platform's imagery (2.3.10); opening the route directly by URL shows no back button. Open iOS screens by `route`; use taps for Android if you like.
- Native-only screens (camera, maps, purchase sheets) will not render on web. Leave them out of a web set or capture them on a device.

If Node is older than 22 (no global `WebSocket`), the script says so. Then either install Node 22, or use a single headless command per screen, which cannot seed storage or tap, so it only reaches screens that need no sign-in:
```
chrome --headless --hide-scrollbars --window-size=402,874 --force-device-scale-factor=3 --screenshot=store/screenshots/ios/iphone/01-<screen>.png http://localhost:8081/<route>
```
On Windows the binary is usually `chrome.exe` under `Program Files\Google\Chrome\Application`, or `msedge.exe`. Headless flags change between browser versions; if the output size is wrong, read the browser's current headless documentation. Its PNGs can carry alpha: flatten them with `--flatten`. A browser automation library already in the project (Playwright, Puppeteer) can do the same with its viewport and deviceScaleFactor options.

Do not upscale. Neither store's spec in our sources mentions upscaling either way, but an upscaled capture has soft text and edges, and rendering at the right scale costs nothing extra.

## Captions and frames (optional)

Captions are a store-ready recommendation, not a store requirement in our sources. If the user wants captions burned into the image:

1. Write a plain HTML page with no external assets, sized in CSS to the target divided by the scale factor (402×874 for 1206×2622 at 3x).
2. Put the caption at the top in the app's font and colors, and the raw screenshot below it, scaled down to fit. The screenshot must stay legible and must not be covered (2.3.3 rejects overlays that hide the UI).
3. Capture the page with `capture.mjs` (a plan whose `baseUrl` serves the page, and a set with the target size), or with the headless command in method 4 followed by `--flatten`.
4. Keep the raw screenshots too, in a folder the checker ignores (outside `store/screenshots/`), so captions can be redone.

Do not draw device frames that show another platform's hardware or UI (2.3.10). Do not put prices, ratings, awards or "#1" in captions (2.3.14).
