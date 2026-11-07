# store/privacy.ios.md template

The user pastes these answers into App Store Connect, App Privacy. Before filling it, open https://developer.apple.com/app-store/app-privacy-details/ and read the current list of data types, purposes and the questions asked for each type. Use Apple's names exactly as they appear there; the columns below mirror those questions, and if the page asks something this template does not, add a column.

Rules from our sources:

- App Privacy details are required for new apps and for updates, and must include data collected by third-party SDKs. https://developer.apple.com/app-store/app-privacy-details/
- They can be changed without a new build, so fix them as soon as the app's data use changes.
- Apps using expo-updates answer "Yes" (the app collects data) and select Crash Data. https://docs.expo.dev/distribution/app-stores/

How to fill it:

- One row per data type, not per SDK. List every source of that type in the "Collected by" column: the app's own backend, and each SDK by package name.
- Read Apple's definition of "collect" on that page before marking a type as not collected. Data that is only used on the device is where this matters most; when you leave such a type out, say why under "Not collected" with the file that proves it.
- Fill SDK rows from the SDK's own privacy documentation and its configuration in this project (is IP collection, user ID, session replay switched on?). If the documentation is silent, say so in Notes and tell the user.
- Leave a cell as `ASK` only for what the code cannot tell you, and list those in "Questions for the user".

```markdown
# App Privacy answers: <App name> <version>

Generated <YYYY-MM-DD> by store-ready ios-privacy. Paste into App Store Connect > App Privacy.
Data type names follow https://developer.apple.com/app-store/app-privacy-details/ as read on <YYYY-MM-DD>.

Privacy policy URL: <https://...>
Data collected: Yes | No

## Data types

| Data type | Collected by | Purposes | Linked to the user | Used for tracking | Notes |
|---|---|---|---|---|---|
| Crash Data | expo-updates, @sentry/react-native | App Functionality | No | No | Sentry `sendDefaultPii` is off in src/lib/sentry.ts |
| Email Address | Supabase Auth (own account system) | App Functionality | Yes | No | Used for sign-in and account recovery only |
| Photos or Videos | Own backend (check-in photos upload) | App Functionality | Yes | No | Only photos the user attaches; uploaded to storage bucket `checkins` |

## Not collected

- Location: requested only to suggest nearby places; the coordinates are used on device and never sent (src/features/places/usePlaces.ts).

## Third-party SDKs reviewed

| Package | Version | What it sends | Source checked |
|---|---|---|---|
| expo-updates | 58.x | Crash Data per Expo guidance | https://docs.expo.dev/distribution/app-stores/ |
| @sentry/react-native | 7.x | Crash reports, device model, OS version | SDK docs URL, project config file |

## Third-party AI

| Provider | Data sent | Consent screen | Disclosed in privacy policy |
|---|---|---|---|
| <provider> | <what the user's request contains> | <file path of the consent screen> | Yes / No |

## Tracking

Tracking permission requested: Yes | No
Reason: <SDK or feature that tracks, or "none">
The app works if the user declines: <how, file path>

## Questions for the user

- ...
```

The example rows show the level of detail expected. Replace them; do not leave them in the user's file.
