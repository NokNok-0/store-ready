# Streaks: known review gaps (before)

This is the "before" state of the store-ready sample. The gaps below are deliberate and are not marked in the code. `store-ready check` and the skills should find and fix them.

| Gap | Why a reviewer flags it |
|---|---|
| No account deletion anywhere (Settings has sign-out only) | Apple 5.1.1(v): apps that support account creation must let users start account deletion in the app. Google Play's account deletion policy also requires an in-app path and a web link listed in the Data safety form. |
| "Continue with Google" without Sign in with Apple or another equivalent login | Apple 4.8: apps that offer a third-party or social login must also offer an equivalent privacy-focused login option, such as Sign in with Apple. |
| No iOS purpose strings for camera or photo library (`expo-image-picker` is used, nothing set in `app.json`) | Apple 5.1.1(ii) and Info.plist rules: each protected resource needs a usage description that says why the app needs it. Missing strings fail upload or crash on access; Expo's generic default text ("Allow $(PRODUCT_NAME) to access your camera") is often rejected as not specific. |
| No privacy policy URL in the app or config | Apple 5.1.1(i) and Google Play's User Data policy: a privacy policy link is required in the store listing and must be reachable inside the app, especially for apps with accounts. |
| No privacy manifest reasons in `app.json` (`ios.privacyManifests` missing) | Apple requires approved reasons for required-reason APIs (for example UserDefaults, file timestamps) used by the app and its SDKs. Expo SDK packages ship their own PrivacyInfo files, but Apple may not read them from static CocoaPods, so the reasons belong in app config; Apple emails missing reasons after upload. |
| `android.permissions` declares `READ_MEDIA_IMAGES` | Google Play's Photo and Video Permissions policy: apps that only need photos occasionally (like a picture per habit) must use the system photo picker, not broad media access. Declaring it requires a Play Console declaration and is usually rejected for this use. |
| No `ios.bundleIdentifier` or `android.package` | Neither store build can be produced or submitted without a stable app identifier; it also cannot be changed after the first release. |

Not a review gap but worth knowing: auth is a local mock (see README) and the icons and splash image are still the Expo template's.
