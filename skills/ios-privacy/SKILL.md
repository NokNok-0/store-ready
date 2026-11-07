---
name: ios-privacy
description: Fixes the iOS privacy work App Review checks - permission purpose strings (NSCameraUsageDescription and other NS*UsageDescription keys in Info.plist or Expo app.json), the privacy manifest (PrivacyInfo.xcprivacy, required reason API declarations such as UserDefaults CA92.1, Expo ios.privacyManifests), App Store Connect App Privacy answers (the privacy "nutrition label") including third-party SDK data, tracking and optional-permission rules, and consent before sending user data to an AI provider. Use when the user mentions a privacy manifest, purpose string, usage description, "missing purpose string", required reason API, an ITMS email about privacy, App Privacy details, privacy label, data collection, App Tracking Transparency, guideline 5.1.1 or 5.1.2, or a privacy rejection from App Review. Produces edited app config or Info.plist/PrivacyInfo.xcprivacy, and store/privacy.ios.md.
license: MIT
---

# ios-privacy

Use this skill before the first App Store submission, whenever dependencies, permissions or data flows change, and when App Review or an Apple email after upload flags a privacy problem.

It produces:

- Edits to the project: `expo.ios.infoPlist`, `expo.ios.privacyManifests` and config plugin options in Expo projects; `ios/<App>/Info.plist` and `ios/<App>/PrivacyInfo.xcprivacy` in bare React Native and native iOS projects.
- Code changes where a permission is forced or AI data sharing has no consent.
- `store/privacy.ios.md`: the answers the user pastes into App Store Connect, App Privacy.

Every Apple and Expo fact this skill uses is in [references/apple-facts.md](references/apple-facts.md) with its source. If you need a rule that is not there, open the official page and read it. Do not state a store rule from memory.

## 1. Inventory

Find out what the app touches before changing anything.

1. Run the dependency scanner from the project root:

   ```
   node <this-skill>/scripts/scan-deps.mjs .
   ```

   It prints JSON: privacy manifests found in `node_modules` (read from files), plus heuristic lists of packages linked to permissions, data collection and AI providers. The heuristic lists are prompts, not findings. Confirm each item in the code or the vendor's documentation before it goes into config or App Store Connect. Flags: `--config <file>` for `app.config.js/ts` projects (see [references/privacy-manifest.md](references/privacy-manifest.md)), `--modules <dir>` when dependencies are hoisted in a monorepo.

2. Read `package.json`, the app config and its `plugins` array, and `ios/` if it exists. Note whether `ios/` is committed or generated (listed in `.gitignore`). If it is committed, the native files ship and app config only applies on the next prebuild.

3. In the source, find:
   - every permission request and the screen it sits on;
   - every network call that sends user data, and where it goes (own backend, analytics, AI provider);
   - sign-up and sign-in: which account data is stored.

4. Ask the user once, together, for what the code cannot tell you: the privacy policy URL; whether any data is used for advertising or shared with other companies; what the backend does with uploaded data if the backend is not in this repository.

## 2. Purpose strings (5.1.1(ii))

A purpose string must say what data the app uses and what for, with an example. Vague strings are rejected.

1. Get the final list of `NS…UsageDescription` keys. Plugins add keys with generic defaults, so app config alone is not the full list. In Expo, run `npx expo prebuild --platform ios --no-install` and read the generated `Info.plist` (delete `ios/` afterwards if it did not exist before). Fallbacks and details: [references/purpose-strings.md](references/purpose-strings.md).
2. For each key, find the feature that asks for it and write the string from that feature: "[App] uses [resource] to [feature]. For example, [concrete case]."
3. Write it where it will survive the next prebuild: the plugin's own option when a plugin owns the key, otherwise `ios.infoPlist`. Read the plugin's README or `app.plugin.js` for its option names.
4. A key for a feature the app does not use: remove it through the plugin if it allows that; otherwise write an accurate string and confirm with the user.

## 3. Privacy manifest (required-reason APIs)

Uploads are checked for required-reason API declarations (enforced since 2024-05-01). Five categories: FileTimestamp, SystemBootTime, DiskSpace, ActiveKeyboards, UserDefaults. The valid reason codes for each are in [references/apple-facts.md](references/apple-facts.md).

- **Expo:** copy every category and reason from `requiredReasonApis.aggregated` into `expo.ios.privacyManifests.NSPrivacyAccessedAPITypes`. Expo packages ship their own PrivacyInfo files, but Apple may not read them from static CocoaPods, so the app config has to carry them.
- **Bare React Native / native iOS:** add them to the app target's `PrivacyInfo.xcprivacy`.
- **The app's own native code:** read Apple's page on required reason APIs (linked in the references) and choose the narrowest code that is true. Do not add every code in a category.
- **Heuristic entries** (`requiredReasonApis.heuristic`): confirm in the package's iOS source first.
- **Third-party SDKs on Apple's list** need their own manifest, and a signature when shipped as binaries. If an installed SDK lacks one, the fix is updating the SDK, not copying reasons.
- **Apple's email after upload** names the missing categories. Map each to a dependency with the scanner, add the reason, rebuild.

Full procedure, JSON and plist shapes: [references/privacy-manifest.md](references/privacy-manifest.md).

## 4. Optional permissions and tracking (5.1.2(i))

The app must work without optional permissions. Forcing push, location or tracking permission to use the app is a 5.1.2(i) rejection.

- Request each permission when the user starts the feature that needs it, not at launch.
- Every request handles denial: the feature explains what it needs and the rest of the app keeps working. Check onboarding flows for a permission screen with no way past it.
- If the app or one of its SDKs tracks users, the user must be able to decline and still use the app. When tracking permission is needed, and what counts as tracking, is defined in guideline 5.1.2 and on the App Privacy details page. Read both before adding or removing a tracking prompt: https://developer.apple.com/app-store/review/guidelines/, https://developer.apple.com/app-store/app-privacy-details/

## 5. Sharing data with AI providers (5.1.2(i), since 2025-11-13)

If the app sends personal data to a third-party AI service, it must say so and get the user's explicit permission first. This applies when the call goes through your own backend too: what matters is that the provider receives the user's data.

Find them with `ai.packages` and `ai.hostsInSource` from the scanner, plus backend code and environment variables naming a provider. Then:

- Show a consent screen before the first request that sends user data. Name the provider, say what is sent (the user's messages, photos, journal entries), and what it is used for. "Not now" must be a real option.
- Store the choice and check it before every such request. Let the user change it in settings.
- If the user declines, disable only the AI feature.
- Add the provider to the privacy policy, and to `store/privacy.ios.md` under Third-party AI.

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'consent.ai.v1';

export function useAiConsent() {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((value) => setGranted(value === 'granted'));
  }, []);

  const update = useCallback(async (value: boolean) => {
    await AsyncStorage.setItem(KEY, value ? 'granted' : 'denied');
    setGranted(value);
  }, []);

  return { granted, grant: () => update(true), revoke: () => update(false) };
}
```

Gate the request on `granted === true`, and show the consent screen when `granted` is `false` and the user taps the feature. Bump the key version when the provider or the data sent changes, so users are asked again. Match the project's existing storage and state libraries rather than adding new ones.

## 6. App Privacy answers

App Privacy details are required for new apps and updates, must include data collected by third-party SDKs, and can be updated without a new build.

1. Open https://developer.apple.com/app-store/app-privacy-details/ and read the current data types, purposes and questions. Use Apple's names exactly.
2. Build one row per data type from the inventory: own backend, auth provider, and each SDK in `dataCollection`. For each SDK, read its own privacy documentation and its configuration in this project.
3. If the app uses expo-updates, answer "Yes" (data is collected) and include Crash Data.
4. Write `store/privacy.ios.md` from [references/privacy-answers-template.md](references/privacy-answers-template.md). Every row cites where the data comes from (file path or package). Unknowns go under "Questions for the user", not into guesses.
5. Check the privacy policy is linked in App Store Connect metadata and inside the app (5.1.1(i)). If the app has no in-app link, add one to the settings or about screen.

Tell the user to paste the answers into App Store Connect, App Privacy, and to update them whenever an SDK or data flow changes.

## Verify

- [ ] Re-run `node <this-skill>/scripts/scan-deps.mjs .`: `missingDeclarations` is empty and `invalidReasonCodes` is empty. Every `heuristic` entry is either declared or noted as confirmed not needed.
- [ ] In the prebuild output (or the native project), every `NS…UsageDescription` value names a feature and gives an example; none is a plugin default such as "Allow $(PRODUCT_NAME) to access…".
- [ ] The generated or edited `PrivacyInfo.xcprivacy` contains every category and reason from app config.
- [ ] If you generated `ios/` only to inspect it, it is deleted again.
- [ ] Each permission request has a denial path; you traced it in code (and on a device or simulator if one is available).
- [ ] Every AI provider found has a consent screen gating its requests, and appears in `store/privacy.ios.md`.
- [ ] `store/privacy.ios.md` exists, has a row for every SDK in `dataCollection` that you confirmed, has Crash Data if expo-updates is installed, and no example rows from the template are left.
- [ ] `npx store-ready check` reports no purpose-string, privacy-manifest or privacy-policy errors.
- [ ] Tell the user the result passes the checks we know about. Do not say it will be approved.
