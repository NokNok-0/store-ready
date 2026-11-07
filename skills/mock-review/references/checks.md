# Checks

Rules are copied from `docs/sources/` (checked 2026-11-07) with the source beside each. "Guidelines" means https://developer.apple.com/app-store/review/guidelines/ (Last Updated: October 16, 2026). Google Play policy centre: https://play.google/developer-content-policy/.

Each check lists what to read, when it fails, and what you cannot verify from files. A failure becomes a finding. Something you cannot verify goes under "Not verified", never under findings.

Status words: **Blocking** means the files show a rule from this page being broken. **Risk** means the evidence points that way but depends on judgment or on something you could not see.

---

## Apple

### 2.1 App completeness: demo account and reviewer access

Rule: crashes, placeholder content, broken links, missing or expired demo login, backend down, and IAP that cannot be reviewed lead to 2.1. Give a working demo account for every role in Review Notes, including the 2FA path. For subscriptions, also give an account with an expired subscription. Demo mode only with Apple's prior approval. Hardware-dependent apps attach a real-device video. Explain IAP that cannot be reviewed in the notes (2.1(b)). Review Notes limit: 4,000 bytes. Sources: https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review ; https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information

Read:
- Whether the app needs sign-in to reach its main features: auth guards in the root layout or navigator, redirects to a login route, a server that rejects anonymous calls.
- The roles in the code: admin, staff, driver and rider, teacher and student, buyer and seller, free and paid.
- Subscriptions or IAP products in code.
- `store/review-notes.txt`.

Fails (Blocking) when:
- sign-in is needed and the notes have no username and password;
- a role found in code has no account in the notes;
- the app has subscriptions and there is no expired-subscription account;
- the code sends a one-time code by SMS or email at login and the notes do not say how the reviewer gets it;
- the app depends on hardware and the notes mention no video;
- the notes describe a "demo mode" instead of an account, and do not mention Apple's approval;
- the notes are over 4,000 bytes (count bytes, not characters).

Fails (Risk) when: the notes give steps that name screens or buttons that do not exist in the code.

Also look, without running the app, for placeholder content and broken links (both named 2.1 triggers):
- `lorem ipsum`, "coming soon" or "not available yet" screens and rows, TODO text in user-facing strings;
- placeholder accounts or addresses (`example.com`, `test@`, hard-coded users) and links to `localhost`, `127.0.0.1`, `example.com` or staging hosts in production config;
- a purchase, subscribe or upgrade button that is disabled or has no purchases SDK behind it;
- a login button (Google, Facebook, Apple) whose handler creates a session without calling the provider;
- template artwork: open the icon, adaptive icon and splash images; the checker's `app.template-content` names known template icons;
- every URL recorded in `store/` files, app config `extra` and the in-app links: open it. A 4xx or 5xx status, a DNS or TLS failure, or a page that does not belong to this app is a broken link.

Each one found is a 2.1 Blocking finding with its path (for a URL: the URL, the file that records it, the status and the date opened). Template artwork is also a 4.1(c) question; cite 4.1 when the icon is another developer's. Route these findings to `app-review-risk` (A9), and broken URLs to the user and the skill that recorded them.

Not verifiable: whether the demo password works, whether the backend is up, whether the app crashes. Always list these.

### 2.3, 2.3.1(a), 2.3.7, 2.3.10: accurate metadata

Rule: metadata and notes must not be misleading or generic; describe new features specifically in Review Notes (2.3, 2.3.1(a)). No keyword stuffing, trademarks or prices in the name (2.3.7). No other platforms' names or imagery (2.3.10). Keywords: 100 bytes, no other app or company names. Name 2–30 characters, subtitle 30, promotional text 170, description 4,000. Sources: guidelines; https://developer.apple.com/help/app-store-connect/reference/app-information/app-information ; https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information

Read `store/listing.ios.json`, then the code. For every feature the description, subtitle or promotional text claims, find the screen that delivers it. For `whatsNew`, find the change and check the review notes describe it.

Fails (Blocking) when:
- a claimed feature does not exist in the code or is unreachable from navigation;
- the name contains a price, a trademark or competitor name, or a string of keywords;
- iOS metadata mentions Android, Google Play or another platform, or screenshots show another platform's UI;
- keywords name other apps or companies;
- a field is over its limit.

Fails (Risk) when: a claimed feature exists only behind a paywall or a role and the listing does not say so; the description is generic enough to fit any app in the category.

### 2.3.3 Screenshots

Rule: splash, login or title-art-only screenshots, outdated UI and overlays that hide the UI are rejected. More than half of the screenshots for each device size must show the app in use. Apple names display classes, not inches. Required: at least one screenshot in "iPhone with Dynamic Island (medium display)", 1179×2556 or 1206×2622 portrait (or landscape equivalents); if the app runs on iPad, "iPad 13-inch display", 2064×2752 or 2048×2732. Other classes (Dynamic Island large, Face ID, Home Button, iPad 11-inch and 10.5-inch, the full list in docs/sources/apple.md) are optional. 1–10 per device size, .jpeg, .jpg or .png, no alpha channels or transparency. Sources: https://developer.apple.com/help/app-review/guideline-reference/2-3-3-screenshots ; https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications

Read `store/screenshots/ios/iphone/` and `store/screenshots/ios/ipad/`. Group the images by display class from their pixel size, not by folder name (the store-screenshots checker prints the class per file). Open each image. For each device size, count images that show a real app screen in use against those that show splash, login, title art or marketing only. Compare screens in the images with the current UI in code (labels, tabs, layout).

Fails (Blocking) when: for any size, half or fewer show the app in use; no image under `store/screenshots/ios/` is in the "iPhone with Dynamic Island (medium display)" class; the app supports iPad (`supportsTablet`, `UIDeviceFamily`, `TARGETED_DEVICE_FAMILY`) and no image is in the "iPad 13-inch display" class; an image has a size in no accepted class, or has alpha.

Fails (Risk) when: screens in the images differ from the current UI; captions or overlays cover most of the UI.

Not verifiable: if you cannot view images, say the "in use" count is unverified and list the files.

### 2.3.14 Creative assets

Rule (added 2026-10-16): creative assets must be relevant to the app or brand, suitable for all audiences, and contain no pricing or unverifiable claims. Source: https://developer.apple.com/news/?id=92th7e5i. Our source does not list which assets 2.3.14 covers; read 2.3.14 on the guidelines page and apply it to the assets it names.

Read the icon, screenshots and their captions, and any promotional art in `store/`.

Fails (Blocking) when an asset shows a price or a discount, or a claim that cannot be checked ("#1", "best", "most downloaded", "award-winning" without naming the award); or shows content not suitable for all audiences.

Fails (Risk) when an asset says "free" or "free trial" (read 2.3.14 on whether that counts as pricing); or has nothing to do with the app's function or brand (stock imagery, unrelated characters).

### 2.5.19 Hidden features (and 2.5.2)

Rule (added 2026-10-16): no hidden, dormant or undocumented features; obfuscating to hide features can end the developer account. 2.5.2: downloaded code that changes features is not allowed. Fix: remove or disclose. Sources: https://developer.apple.com/news/?id=92th7e5i ; guidelines.

Read:
- Feature flags and remote config (LaunchDarkly, Firebase Remote Config, Statsig, custom `/flags` endpoints, `if (config.enableX)`).
- Screens or routes not reachable from navigation; debug or admin menus; gestures that unlock screens (long-press on logo, tap counters).
- Region, date or server-switched behaviour (`if (country === ...)`, `if (Date.now() > ...)`).
- Code that is obfuscated or encoded beyond what the build does by default.
- OTA update tooling (`expo-updates`, CodePush).

Fails (Blocking) when a feature is switched off at review time by a flag, date, region or server switch and the review notes do not describe it; or code is deliberately obfuscated to hide what it does.

Fails (Risk) when a debug or admin screen ships in the production build without being gated to the developer.

Not verifiable: what future OTA updates will change. If OTA tooling is present, note it and point to 2.5.2 on the guidelines page.

### 3.1.1 In-app purchase

Rule: unlocking digital content via license keys, QR codes or crypto is rejected; use IAP and include restore. On the US storefront, external purchase links, buttons and calls to action are allowed without an entitlement (2025-05-01). 3.1.1(a): the music streaming entitlement was folded into StoreKit External Purchase Link entitlements (2026-10-16). Sources: guidelines; https://developer.apple.com/news/?id=9txfddzf ; https://developer.apple.com/news/?id=92th7e5i

Read: payment SDKs (Stripe, PayPal, Braintree, web checkout links), IAP libraries (StoreKit, `react-native-iap`, `expo-iap`, `react-native-purchases`), code entry screens (license key, promo code, QR scan to unlock), crypto payment code, and what the purchase unlocks.

Fails (Blocking) when digital content or features are unlocked by a non-IAP payment, a license key, a QR code or crypto, outside what the US storefront rule allows; or IAP exists with no restore purchases action.

Fails (Risk) when external purchase links are shown and the app is available outside the US: read 3.1.1 and 3.1.1(a) on the guidelines page for other storefronts. When the payment is for physical goods or services used outside the app, our sources do not cover the rule: read section 3.1 before raising anything.

Not verifiable: whether IAP products are created and submitted in App Store Connect.

### 4.8 Login services

Rule: if third-party or social login is the primary account option, also offer a login that limits data to name and email, lets the user hide their email, and does no ad tracking without consent. Sign in with Apple qualifies. Exceptions: company-only accounts, education or enterprise, government ID, clients for a specific third-party service. Source: guidelines.

Read: auth providers in code (Google, Facebook, X, GitHub, Firebase or Supabase social providers, `expo-auth-session` providers) and whether Sign in with Apple (`expo-apple-authentication`, `AuthenticationServices`) or another qualifying option is on the same screen for iOS.

Fails (Blocking) when a third-party login is offered on iOS with no qualifying option and none of the exceptions applies.

Fails (Risk) when an exception might apply: say which one and what would confirm it.

### 5.1.1(i) Privacy policy

Rule: link the privacy policy in App Store Connect metadata and inside the app. Sources: guidelines; https://docs.expo.dev/distribution/app-stores/

Read: a privacy policy link in the app (settings, about, sign-up screen), the URL in `store/` files or app config.

Fails (Blocking) when the app has no in-app link; or no URL is recorded anywhere in the project.

Open the URL. Fails (Blocking) when it does not load (4xx, 5xx, DNS or TLS error), or loads a page that is not a privacy policy for this app or developer. Record the status and the date either way.

Not verifiable: what is entered in App Store Connect; the URL, only if you cannot make network requests at all (say so).

### 5.1.1(ii) Purpose strings

Rule: purpose strings must say what the data is used for, with an example. Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-purpose-strings

Read every `NS*UsageDescription` in `ios.infoPlist`, config plugin options (camera, photos, location, contacts, microphone plugins take a permission string), and `Info.plist`. Compare each with where the permission is used in code.

Fails (Blocking) when a string is generic ("This app needs access to your camera", "Allow access", a library's default string left unchanged) or does not match the actual use.

Fails (Risk) when a string says what but gives no example.

### 5.1.1(v) Account deletion

Rule: users must be able to start deletion inside the app; deactivation alone is not enough; applies to all account types; if deletion completes on the web, link directly to that page; no phone or email-only flows unless in a 5.1.1(ix) regulated field; apps using Sign in with Apple must revoke tokens via the REST API; tell subscribers that Apple billing continues until they cancel. Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion

Read: sign-up code; a delete account action and what it calls; the server endpoint if it is in the repo; Sign in with Apple token revocation on deletion; subscription messaging on the delete screen.

Fails (Blocking) when accounts can be created (including accounts that live only on the device; the rule applies to all account types) and there is no in-app path to start deletion; the path only deactivates; the path is "email us" or "call us" outside a regulated field; a web flow is linked to a home page rather than the deletion page; Sign in with Apple is used, the app's server or auth provider received Apple tokens or an authorization code, and deletion does not revoke them.

Fails (Risk) when subscriptions exist and the delete flow does not say Apple billing continues.

Sign in with Apple with no server: our source says apps using Sign in with Apple must revoke tokens via the REST API; it does not describe an app that never sends a token anywhere. If the code shows that no identity token or authorization code ever leaves the device (the credential only maps to a local profile, no network call, no auth provider), do not mark it Blocking. Record it as a Risk: what the code does (file and line), that no token reached a server so there is nothing on a server to revoke, and the page for the user to read: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion and https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens. If any token or code is sent to a server, revoke it there.

Not verifiable: whether the server actually deletes the data.

### 5.1.2(i) Data sharing and forced permissions

Rule: disclose sharing data with third parties, including AI providers, and get explicit permission. Do not force push, location or tracking permission to use the app; it must work without optional permissions. Sources: guidelines; https://developer.apple.com/news/?id=ey6d8onl

Fails (Blocking) when user content or personal data is sent to an AI or other third-party API with no consent step before the first send; or the app blocks use until an optional permission is granted.

### App Privacy details and age rating (consistency only)

App Privacy details must include data collected by third-party SDKs. Apps using `expo-updates` should answer Yes and select Crash Data. New age rating descriptors Shared Location and Dating & Relationships are required on submissions from 2026-11-16. Sources: https://developer.apple.com/app-store/app-privacy-details/ ; https://docs.expo.dev/guides/apple-privacy/ ; https://developer.apple.com/news/?id=yxkh08us

Fails (Risk) when `store/privacy.ios.md` omits an SDK found in dependencies, or `store/age-rating.md` lacks an answer the app clearly needs (location sharing, dating). Route the fix to `ios-privacy` or `age-rating`.

### 1.2 User-generated content and 1.5 developer information

1.2: apps with user content need a content filter, a report mechanism, user blocking and published contact info; random or anonymous chat falls under 1.2. 1.5: accurate contact info in the app and a working Support URL. Sources: guidelines; https://developer.apple.com/news/?id=d75yllv4

Fails (Blocking) when users can see each other's content and report or block is missing; or no contact info or support URL can be found.

Open the support URL. Fails (Blocking) when it does not load. Not verifiable only if you cannot make network requests at all.

---

## Google Play

### Data safety

Rule: required for every app on closed, open or production tracks, even apps that collect nothing; must include data collected by SDKs and web views; privacy policy required; inaccurate forms can block updates or remove the app. Source: https://support.google.com/googleplay/android-developer/answer/10787469

Fails (Blocking) when `store/data-safety.android.md` is missing; or an SDK in dependencies whose own documentation says it collects data is not reflected; or no privacy policy URL is recorded.

### Account deletion

Rule: apps that let users create an account must offer an in-app deletion path, a web link to request deletion without reinstalling, deletion of associated data (disclose anything retained), and declare it in the Data safety form. Source: https://support.google.com/googleplay/android-developer/answer/13327111

The help page (re-checked 2026-11-07) also says: "The weblink must be functional (for example, loads without error)"; the deletion request path must be "prominently featured and easily discoverable"; it must let users request deletion "without sending the user back to the app"; it must name the app or developer as shown on the store listing. And: "accounts that are created and operated offline are not app accounts and do not fall within policy scope."

Fails (Blocking) when any of the four is missing from the code or `store/` files; or the web link recorded in `store/data-safety.android.md` does not load when you open it.

Fails (Risk) when the page loads but does not name the app or developer as on the listing, or sends the user back to the app to delete.

If the accounts are created and operated offline (no server, no sync), quote the sentence above, record the evidence (no network calls in the auth and storage code), and mark the web link check passed as out of policy scope, with "confirm with the user that no account data leaves the device" under Not verified. A web link that is recorded anyway must still load.

Not verifiable: whether the server deletes the data; the web link, only if you cannot make network requests at all.

### Permissions

Rule and sources:
- READ_MEDIA_IMAGES / READ_MEDIA_VIDEO only when the system photo picker cannot support core functionality, with a declaration. https://support.google.com/googleplay/android-developer/answer/14115180
- Background location: declaration for one core feature, a demo video of 30 seconds or less showing the in-app disclosure and the runtime prompt, privacy policy covering location, test credentials if login is needed. https://support.google.com/googleplay/android-developer/answer/9799150
- USE_EXACT_ALARM only for alarm, timer or calendar apps, with a declaration; others use SCHEDULE_EXACT_ALARM. https://support.google.com/googleplay/android-developer/answer/16558241
- Foreground services (target 14+): declare each type and its FOREGROUND_SERVICE_* permission; description, user impact, demo video and use case in App content. https://support.google.com/googleplay/android-developer/answer/13392821
- USE_FULL_SCREEN_INTENT auto-granted only for alarm and calling apps (Android 14+). MANAGE_EXTERNAL_STORAGE, QUERY_ALL_PACKAGES and Accessibility API use need declarations. Recorded in our sources without a page URL: cite the Permissions section of https://play.google/developer-content-policy/ and read it there.

Read the merged permission list: `android.permissions` in app config plus permissions added by libraries (check the libraries' config plugins), or `AndroidManifest.xml`.

Fails (Blocking) when one of these permissions is declared and the matching declaration is not prepared in `store/data-safety.android.md`, or the use does not fit the allowed case.

### Target API level

Rule: from 2026-08-31 new apps and updates must target API 36 (Wear OS and Automotive 35; TV and XR 34). Source: https://developer.android.com/google/play/requirements/target-sdk

Fails (Blocking) when `targetSdkVersion` is below 36 for a phone or tablet app. Expo SDK 58 defaults to 36 (https://expo.dev/changelog/sdk-58).

### Minimum and broken functionality

Rule: static text or PDF-only apps, single-wallpaper apps and apps that do nothing are not allowed; apps that crash, freeze, fail to install or fail to load are rejected. Source: https://support.google.com/googleplay/android-developer/answer/9898783

Fails (Blocking) when the app is static content only. Crashes are not verifiable from files.

### Store listing and graphics

Rule: app name 30, short description 80, full description 4,000 characters; keyword stuffing can lead to suspension. Icon 512×512 32-bit PNG up to 1024 KB; feature graphic 1024×500 JPEG or 24-bit PNG without alpha; at least 2 screenshots to publish, up to 8 per device type, each side 320–3840 px, longest side at most twice the shortest. Sources: https://support.google.com/googleplay/android-developer/answer/9859152 ; https://support.google.com/googleplay/android-developer/answer/1078870

Apply the same feature-by-feature accuracy check as Apple 2.3 to `store/listing.android.json`. Our Play sources state no "in use" screenshot rule; do not apply Apple's to Play.

### Content rating

Rule: every app needs an IARC rating from the App content questionnaire; retake it when content changes. Source: https://support.google.com/googleplay/android-developer/answer/9898843

Fails (Risk) when `store/age-rating.md` has no Play section, or features found in code (chat, user content, location sharing) are not reflected in the answers.

### Reviewer access on Play

Our sources do not say how Play reviewers get login access in general (only for background location). If the app needs sign-in, list under "Not verified" that the user must give Google access as Play Console's App content section requires, and tell them to read it there.
