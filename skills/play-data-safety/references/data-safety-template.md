# store/data-safety.android.md template

The user copies these answers into Play Console, App content, Data safety, and the permission declarations into the matching App content forms.

Before filling it, open https://support.google.com/googleplay/android-developer/answer/10787469 and read the current data types, purposes and questions, and how Google defines collection and sharing. Use Google's names exactly. The columns below mirror the form's questions; if the page asks something the template does not, add a column.

Rules from our sources:

- The form is required for every app on closed, open or production tracks, even one that collects nothing.
- It must include data collected by SDKs and webviews.
- A privacy policy is required.
- Inaccurate answers can block updates or get the app removed.

How to fill it:

- One row per data type. "Collected by" lists every source: own backend, auth provider, each SDK by package name, and any webview that loads third-party pages or scripts.
- For each SDK, read its own Play Data safety guidance (many vendors publish one) and check how it is configured in this project.
- A webview showing your own site still counts if that site runs analytics or ads scripts. List them.
- If iOS answers already exist in `store/privacy.ios.md`, start from the same inventory, but answer Google's questions on their own terms. The two forms do not use the same categories.
- Leave `ASK` only for what the project cannot tell you, and list it under "Questions for the user".

```markdown
# Data safety answers: <App name> <versionName> (<versionCode>)

Generated <YYYY-MM-DD> by store-ready play-data-safety. Paste into Play Console > App content > Data safety.
Data type names follow https://support.google.com/googleplay/android-developer/answer/10787469 as read on <YYYY-MM-DD>.

Privacy policy URL: <https://...>
Target SDK: 36 (from <file or "Expo SDK 58 default">)

## Overview

Does the app collect or share any of the required user data types? Yes | No
Is all user data encrypted in transit? <Yes/No, with evidence: e.g. all requests go to https:// URLs in src/lib/api.ts>
Account creation: <how users create accounts>
Delete account URL: <https://... from account-deletion, or ASK>

## Data types

| Data type | Collected by | Collected | Shared | Optional | Purposes | Notes |
|---|---|---|---|---|---|---|
| <type as named by Google> | <backend / SDK package> | Yes/No | Yes/No | Yes/No | <purposes as named by Google> | <file path or config proving it> |

## SDKs and webviews reviewed

| Package or webview | Version | What it sends | Source checked |
|---|---|---|---|
| <package> | <x.y> | <data> | <vendor doc URL, config file> |

## Permissions

| Permission | Source (app config / plugin / library) | Decision | Declaration needed |
|---|---|---|---|
| android.permission.CAMERA | expo-camera plugin | Kept: photo check-ins | No |
| android.permission.READ_MEDIA_IMAGES | expo-image-picker library manifest | Blocked in app.json; system photo picker used | No |

## Declarations to submit

For each permission kept that needs one: the Play Console form, the text to paste, and what the demo video must show (shot by shot, 30 seconds or less where the policy sets that limit).

## Not verified

- <e.g. merged manifest not checked against a release build; confirm the permission list in Play Console after upload>

## Questions for the user

- ...
```

The example permission rows show the level of detail expected. Replace them; do not leave them in the user's file.
