# Purpose strings

Rule (5.1.1(ii)): a purpose string says what data the app uses, what it is used for, and gives an example. Vague strings are rejected. Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-purpose-strings

Purpose strings are the `NS…UsageDescription` values in Info.plist. iOS shows them in the permission prompt, so the reviewer reads them next to the feature that asked.

## Find every key the build will contain

A key ends up in the binary from three places. Check all three.

1. **App config.** `expo.ios.infoPlist` in `app.json` or `app.config.*`.
2. **Config plugins.** Many Expo and community packages add their keys at prebuild, with a default string when you pass none. Read the plugin's options in the package README or in `node_modules/<package>/app.plugin.js` (or the file it points to). The option names differ per package; do not guess them.
3. **Native project.** In bare React Native or native iOS, `ios/<App>/Info.plist`. In Expo with committed `ios/`, this file is what ships; app config only applies on the next prebuild.

To see the final values in an Expo project, read the introspected config. It runs the config plugins without writing native folders, and works on every OS:

```
node -e "require('fs').writeFileSync('expo-introspect.json', require('child_process').execSync('npx expo config --type introspect --json', { maxBuffer: 1 << 26 }))"
```

Read `ios.infoPlist` in `expo-introspect.json`, pass the file to the checker with `npx store-ready check --config expo-introspect.json` (it warns on plugin default strings), then delete it.

On Windows and Linux, iOS prebuild does not run (Expo prints "Skipping generating the iOS native project files" and exits with "At least one platform must be enabled"), so use the command above. On a Mac, `npx expo prebuild --platform ios --no-install` and the generated `Info.plist` under `ios/` also work. Prebuild rewrites the `"ios"` and `"android"` scripts in `package.json` (to `expo run:ios` / `expo run:android`) and creates `ios/`: restore the scripts and delete `ios/` if it did not exist before.

If a package that requests a permission has a config plugin and the plugin is not in `plugins`, add it with its options; until then its purpose strings cannot be set through the plugin.

Every `NS…UsageDescription` key in that file needs a string you would defend to a reviewer, including keys added by a plugin for a feature the app never uses. For those, check whether the plugin can leave the key out; if it can, do that, because a string for an unused feature is hard to make specific and true. If it cannot, write a string that describes the feature the library provides and confirm with the user that the app does not use it.

## Where to write the string (Expo)

- If a plugin owns the key, set it through that plugin's option, so a later prebuild does not put the default back.
- If no plugin owns it, set it in `ios.infoPlist`.
- Set each key in one place only, then confirm the final value in the introspect or prebuild output. When both a plugin option and `ios.infoPlist` set the same key, which one wins depends on the plugin.

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Habitly uses the camera to take a photo for a check-in, for example a picture of your finished run."
      }
    }
  }
}
```

## Writing them

Shape: **[App] uses [resource] to [feature the user sees]. For example, [concrete case].**

- Name the feature the user will recognise, not the API.
- One or two sentences. No "please", no "to improve your experience", no mention of permissions in general.
- If the data leaves the device, say where it goes in plain words ("is sent to our servers to…", "is shared with [provider] to…").
- Localise them if the app is localised. A purpose string in a language the app does not otherwise use reads as an afterthought.

| Rejected | Passes the checks we know about |
|---|---|
| "This app needs access to your camera." | "Habitly uses the camera to take a photo for a check-in, for example a picture of your finished run." |
| "Allow $(PRODUCT_NAME) to access your photos" (typical plugin default) | "Habitly opens your photo library so you can attach a photo to a habit, for example a meal you logged." |
| "Location is used to improve your experience." | "Habitly uses your location to suggest nearby gyms when you add a workout habit. Your location is not stored." |
| "Microphone access required." | "Habitly records a voice note when you hold the mic button on a check-in. Notes stay on your device." |

Write the strings from what the code does. Find the call site for each permission (search for `requestPermissionsAsync`, `use…Permissions`, `request(` from `react-native-permissions`, or native `requestAccess` calls) and describe that screen. If you cannot find a call site for a key, the key is probably there because of a plugin default: handle it as described above.

## When the user is asked matters too

5.1.2(i): the app must work without optional permissions. Ask in context, when the user taps the feature, and handle "Don't Allow" by keeping the rest of the app usable. A permission request on the first launch screen with no way past it is a rejection risk even with a perfect string.
