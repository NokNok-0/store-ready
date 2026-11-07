# EAS Build and Submit: the path to both stores

Copied from `docs/sources/expo.md` in the store-ready repo, checked 2026-11-07. This is the minimum to get a build into both stores. For EAS depth (workflows, environment variables, custom builds, updates), use Expo's own skills: https://docs.expo.dev/skills/. Do not duplicate them here.

## Setup

Source: https://docs.expo.dev/build/setup/

```
npm i -g eas-cli
eas login
eas build:configure
```

`eas build:configure` writes `eas.json`. Store release builds on iOS need the Apple Developer Program ($99/year).

## Profiles in eas.json

Sources: https://docs.expo.dev/build/eas-json/, schema https://docs.expo.dev/eas/json/

| Profile | What it is for | Key settings |
|---|---|---|
| `development` | Development client for local work | `developmentClient: true`, `distribution: "internal"` |
| `preview` | Internal testing builds | `distribution: "internal"`; optionally `android.buildType: "apk"` for sideloading |
| `production` | Store builds | Builds an .aab on Android |

Submit profiles live in the same file. The schema page lists the field names for the Android service account key, track and release status, and for the iOS App Store Connect app and API key. Read it before editing; do not guess field names.

## Credentials

Sources: https://docs.expo.dev/app-signing/security/, https://docs.expo.dev/app-signing/local-credentials/

- EAS can generate the Android keystore, and create iOS certificates and provisioning profiles after the user signs in with their Apple ID. The Apple login is used locally and is not stored on Expo's servers.
- Local credentials are possible with `credentials.json`.
- The user signs in. Never ask for or type an Apple ID password yourself.

## Build

```
eas build -p ios --profile production
eas build -p android --profile production
```

or `eas build -p all --profile production`.

- Cloud builds work from Windows, macOS and Linux (https://docs.expo.dev/submit/testflight/).
- `eas build --local` does not support Windows (https://docs.expo.dev/build-reference/local-builds/).
- `npx expo run:ios` needs a Mac with Xcode.
- Which Xcode the iOS build image uses: https://docs.expo.dev/build-reference/infrastructure/. Uploads need Xcode 26+ since 2026-04-28.

## Version and build numbers

Every upload needs a new `versionCode` (Android) or `buildNumber` (iOS) (https://docs.expo.dev/submit/introduction/). Before each store build, confirm how the project increments them: in app config, or managed by EAS. The eas.json schema documents the options. A rejected upload because of a reused number costs a full build.

## Submit to App Store Connect and TestFlight

Sources: https://docs.expo.dev/submit/introduction/, https://docs.expo.dev/submit/testflight/

```
eas submit -p ios --latest
```

- Creates the App Store Connect app if it is missing.
- CI (`--non-interactive`) needs an App Store Connect API key from a user with the Account Holder or Admin role.
- `--path` submits a specific build file; `eas build --auto-submit` builds and submits in one step.
- The build then appears in TestFlight. External testers need Beta App Review for the first build of a version.

## Submit to Google Play

Sources: https://docs.expo.dev/submit/introduction/, https://docs.expo.dev/submit/android/

```
eas submit -p android --latest
```

- Create the app in Play Console first.
- Provide a Google service account key. It is a secret: keep it out of git.
- The first upload goes to the internal track.
- `releaseStatus: "draft"` uploads without rolling out, so nothing reaches users until someone presses the button in Play Console. Use it until the user has done one release by hand.
- Read https://docs.expo.dev/submit/android/ for whether the very first upload of a new app must be made by hand in Play Console. Our sources do not say.

## Order for a new personal Play account

1. Build the production AAB.
2. Submit to the internal track as a draft; check it installs and runs.
3. In Play Console, create a closed testing release with that build and add at least 12 testers. Start the 14-day clock the same day.
4. Ship fixes to the closed track during the 14 days; the testers stay opted in.
5. After 14 days with 12+ testers, apply for production access in Play Console.

## Free plan limits

Source: https://expo.dev/pricing

- Up to 15 Android and 15 iOS builds per month.
- Low-priority build queue.
- 45-minute build timeout.
- 1,000 monthly active users for EAS Update.
- Submit is included.

Fifteen builds per platform go quickly when every fix needs a rebuild. Build preview profiles only when needed, and catch config errors with `npx expo-doctor` or a local export before spending a cloud build.

## EAS Update

Source: https://docs.expo.dev/eas-update/getting-started/

Native changes need a new build, and so a new store submission: new permissions, purpose strings, SDK upgrades and target API changes are all native. `eas update` needs `--environment` from SDK 55.
