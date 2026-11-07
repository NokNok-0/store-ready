# Expo and EAS: verified facts

Checked 2026-11-07 against docs.expo.dev and expo.dev.

## Versions

Sources: https://docs.expo.dev/versions/latest/, https://expo.dev/changelog/sdk-58, https://docs.expo.dev/get-started/create-a-project/

- Latest is SDK 58 (2026-10-15): React Native 0.88, React 19.3.0, Node 22.13+. Supports Android 7+ and iOS 16.4+, Xcode 26.4+.
- SDK 58 defaults to targetSdk 36 and compileSdk 37 on Android.
- `npx create-expo-app@latest` still creates an SDK 57 project until Expo Go for SDK 58 ships. For SDK 58 use `npx create-expo-app@latest --template default@sdk-58` with a development build.
- SDK 58 breaking changes: R8 on by default for Android release builds; iOS prebuild generates SceneDelegate; InteractionManager removed; Expo Router `withLayoutContext` deprecated in favour of `integrateWithRouter`.

## EAS Build and Submit

- Setup (https://docs.expo.dev/build/setup/): `npm i -g eas-cli`, `eas login`, `eas build:configure`, `eas build -p android|ios|all`. Store release builds on iOS need the Apple Developer Program ($99/year).
- Credentials: EAS can generate the Android keystore and create iOS certificates and provisioning profiles after Apple ID sign-in; the Apple login is used locally and not stored on Expo's servers (https://docs.expo.dev/app-signing/security/). Local credentials via `credentials.json` (https://docs.expo.dev/app-signing/local-credentials/).
- iOS without a Mac: cloud `eas build` and `eas submit` work from Windows, macOS and Linux (https://docs.expo.dev/submit/testflight/). `eas build --local` does not support Windows (https://docs.expo.dev/build-reference/local-builds/). `npx expo run:ios` needs a Mac with Xcode.
- eas.json (https://docs.expo.dev/build/eas-json/, schema https://docs.expo.dev/eas/json/): development profile `developmentClient: true`, `distribution: "internal"`; preview profile internal, optionally `android.buildType: "apk"`; production profile builds an .aab.
- Submit (https://docs.expo.dev/submit/introduction/, https://docs.expo.dev/submit/android/): `eas submit -p android|ios`, `--latest`, `--path`, `--non-interactive`; `eas build --auto-submit`. Android: create the app in Play Console first and provide a Google service account key; first upload goes to the internal track; `releaseStatus: "draft"` uploads without rolling out. iOS: `eas submit` creates the App Store Connect app if missing; CI needs an App Store Connect API key (Account Holder or Admin). Every upload needs a new versionCode or buildNumber.
- EAS Update (https://docs.expo.dev/eas-update/getting-started/): `eas update:configure`, a `channel` per build profile, `eas update --channel X --message "..." --environment production` (`--environment` required from SDK 55). Native changes need a new build.
- Free plan (https://expo.dev/pricing): up to 15 Android and 15 iOS builds per month, low-priority queue, 45-minute build timeout, 1,000 update MAUs, Submit included.

## Store guidance from Expo

Sources: https://docs.expo.dev/distribution/app-stores/, https://docs.expo.dev/guides/apple-privacy/

- A privacy policy is required.
- Apps using expo-updates should answer "Yes" and select Crash Data in App Privacy.
- Test on iPad even if `supportsTablet` is false.
- Privacy manifests: set `expo.ios.privacyManifests.NSPrivacyAccessedAPITypes` with entries of `NSPrivacyAccessedAPIType` and `NSPrivacyAccessedAPITypeReasons` (for example UserDefaults with `CA92.1`). Expo SDK packages ship their own PrivacyInfo files, but Apple may not read them from static CocoaPods, so copy the reasons into app config. Apple emails missing reasons after upload.

## Testing

- Unit tests (https://docs.expo.dev/develop/unit-testing/): `npx expo install jest-expo jest @types/jest --dev`, `npx expo install @testing-library/react-native --dev` (extra `--` on Windows), `"jest": { "preset": "jest-expo" }`. From SDK 58 jest-expo requires Jest 30; react-test-renderer is deprecated.
- End-to-end: Expo documents Maestro through EAS Workflows (https://docs.expo.dev/eas/workflows/examples/e2e-tests/).
- Android emulator on Windows (https://docs.expo.dev/workflow/android-studio-emulator/): JDK 17, Android Studio with SDK Platform 36, `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`, create an AVD, `npx expo start` then press `a`.
