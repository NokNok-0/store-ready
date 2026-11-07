# Privacy manifest: required-reason APIs

Facts and sources are in [apple-facts.md](apple-facts.md). This file is the procedure.

## What has to be declared

Every required-reason API category used by the app's own code or by any library compiled into it, each with at least one reason code that matches the actual use. Five categories exist in our sources: FileTimestamp, SystemBootTime, DiskSpace, ActiveKeyboards, UserDefaults.

React Native and Expo apps almost always hit some of these through their dependencies, even when the app's own JavaScript never touches them.

## Collect what the dependencies declare

Run the scanner from the skill directory against the project:

```
node <this-skill>/scripts/scan-deps.mjs <project-root>
```

(`<this-skill>` is the skill's own folder; see the SKILL.md.)

`requiredReasonApis.fromPackageManifests` lists every `PrivacyInfo.xcprivacy` found in `node_modules`, the package it belongs to, and the categories and reasons inside. `requiredReasonApis.aggregated` merges them. These are facts read from files.

`requiredReasonApis.heuristic` lists packages the scanner associates with a category even though no manifest was found for them. These are guesses. Confirm each one by reading the package's iOS source or its documentation before declaring anything.

Packages that ship a manifest but are not compiled into the iOS app (JavaScript-only tools, packages for other platforms) can show up. Drop a package only when you have checked that it has no iOS native code (no `ios/` folder, no `.podspec`).

## Expo: write the declarations into app config

Apple may not read the manifests inside static CocoaPods, so copy the aggregated reasons into `expo.ios.privacyManifests.NSPrivacyAccessedAPITypes`. Keep every reason a package declares; the package author chose it for the API use inside that package.

```json
{
  "expo": {
    "ios": {
      "privacyManifests": {
        "NSPrivacyAccessedAPITypes": [
          {
            "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
            "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
          },
          {
            "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp",
            "NSPrivacyAccessedAPITypeReasons": ["C617.1"]
          }
        ]
      }
    }
  }
}
```

The values above are an example of the shape. Use what the scanner found.

If the project uses `app.config.js` or `app.config.ts`, the scanner cannot read it statically. Run `npx expo config --json`, save the output to a file, and pass it with `--config <file>` so `missingDeclarations` is computed against the real config.

## The app's own native code

If the project has its own native modules (Swift or Objective-C under `ios/` or in a local Expo module), search them for the APIs in each category and declare them too. Apple's page lists which APIs belong to which category and what each reason code permits: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api. Read it and choose the narrowest code that is true. Do not add every code in a category to be safe; each code is a statement about how the data is used.

## Bare React Native and native iOS

Edit the app target's `PrivacyInfo.xcprivacy` (usually `ios/<App>/PrivacyInfo.xcprivacy`). If the file does not exist, create it and make sure it is a member of the app target; a manifest that is not in the target is not in the build. Same structure as above, as a property list:

```xml
<key>NSPrivacyAccessedAPITypes</key>
<array>
  <dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
      <string>CA92.1</string>
    </array>
  </dict>
</array>
```

Leave the other top-level keys in the file as they are unless you know they are wrong; this skill only covers `NSPrivacyAccessedAPITypes`.

## Third-party SDKs on Apple's list

Apple lists SDKs that need their own manifest and, when shipped as binaries, a signature: https://developer.apple.com/support/third-party-SDK-requirements/. For each native SDK in the app, check it is on a version that ships a manifest. If it is on the list and the installed version has no manifest, update it. Do not paper over a missing SDK manifest by copying its reasons into the app's manifest and calling it done; tell the user the SDK needs updating.

## After an upload

Apple emails missing reasons after upload (Expo's guide). If the user pastes that email, take each category it names, find which dependency uses it with the scanner, add the reason, and rebuild. Quote the email's wording back to the user rather than an error code from memory.
