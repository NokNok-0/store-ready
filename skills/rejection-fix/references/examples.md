# Worked examples

The rejection texts below are illustrative. Apple's and Google's exact wording varies between messages; parse what the user actually pastes. App names, packages, SDKs and file paths are made up.

Each example shows the input, then the output the skill produces: parse, cause, where it is, fix, reply.

---

## 1. Apple 2.1: demo account does not work

### Input

```
Guideline 2.1 - Performance - App Completeness

We were unable to sign in with the demo account credentials provided in App Store Connect.
The message "Invalid email or password" was displayed.

Next Steps
Please provide valid demo account credentials. If your app requires a code sent by
email or SMS, include a way for us to receive it.
```

Project: Courtside, an Expo app for booking tennis courts. Two roles: player and club admin.

### Output

**Parsed.** Apple, 2.1 App Completeness. One issue: demo login failed. Secondary: login sends a code.

**Cause.** The demo account in the notes does not exist on the backend the release build uses.

**Where.**
- `store/review-notes.txt:3` gives `review@courtside.app`.
- `eas.json` production profile sets `EXPO_PUBLIC_API_URL=https://api.courtside.app`.
- `scripts/seed-staging.ts:12` creates `review@courtside.app`; nothing seeds it on production.
- `src/auth/verify-code.tsx` asks for a 6-digit code sent by email after password sign-in.
- `src/auth/roles.ts:3` defines `player` and `club_admin`; the notes cover only one account.

**Fix.**
- Asked the user to create both demo accounts on production and set passwords. (Server data; not something to do from the repo.)
- Asked the user how reviewers get past the email code. They chose a fixed code for the two review accounts, set on the server.
- Rewrote `store/review-notes.txt` with both accounts, the code, and steps for each role (via `review-notes`), 1,140 bytes.
- No new build: the app was fine; the account was not. The user pastes the new notes and credentials into the version's App Review Information and resubmits.
- Told the user to sign in with both accounts on a fresh install of the production build before replying.

**Reply.**

```
Hi,

The demo account was created on our staging server instead of production. That is fixed, and we added a second account for the club admin role, which we had missed (Guideline 2.1).

Player: review@courtside.app / <password>
Club admin: review-admin@courtside.app / <password>

After the password, the app asks for an email code. For both review accounts the code is 482913.

1. Sign in as Player. The Courts tab lists courts at Demo Tennis Club.
2. Tap a court, choose a time, tap Book.
3. Sign out (Profile > Sign out) and sign in as Club admin. The booking appears under Bookings.

The same details are in the App Review Information for this version.

Sam
```

---

## 2. Apple 5.1.1(v): no account deletion

### Input

```
Guideline 5.1.1(v) - Data Collection and Storage

The app supports account creation but does not include an option to initiate account
deletion. Apps that support account creation must also offer account deletion.

Next Steps
Update the app to let users initiate deletion of their account from within the app.
```

Project: Moodnote, Expo journaling app. Email sign-up and Sign in with Apple through Supabase. Optional yearly subscription.

### Output

**Parsed.** Apple, 5.1.1(v). Code fix; new build.

**Cause.** Accounts can be created; there is no deletion path.

**Where.**
- `app/(auth)/sign-up.tsx` creates accounts; `src/lib/auth.ts:40` uses `expo-apple-authentication`.
- `app/(tabs)/settings.tsx` has Log out and nothing else under Account.
- No server function deletes a user. No code revokes Sign in with Apple tokens.
- `src/billing/` sells a yearly subscription.

**Fix** (made through `account-deletion`; rules from https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion):
- Added Settings > Account > Delete account, a confirm screen that says what is deleted and that billing through Apple continues until the user cancels the subscription, and a call to a new server function.
- The server function deletes the journal entries and the auth user, and revokes the Sign in with Apple token through Apple's REST API.
- No deactivate-only option, no "email us" step.
- Android is also live, so the same flow covers Play, plus a web deletion page for Play's requirement (https://support.google.com/googleplay/android-developer/answer/13327111). `store/data-safety.android.md` updated to declare it.
- Build number raised from 21 to 22. `npx store-ready check` no longer reports the deletion warning.

**Reply.**

```
Hi,

Build 22 adds in-app account deletion (Guideline 5.1.1(v)).

1. Sign in with the demo account in the review notes.
2. Open Settings > Account > Delete account.
3. Tap Delete account to confirm.

This deletes the account and all journal entries, and revokes Sign in with Apple for accounts created with it. Subscribers are told on the confirm screen that billing through Apple continues until they cancel the subscription.

Sam
```

---

## 3. Apple 4.3(a): spam, same app under several bundle IDs

### Input

```
Guideline 4.3(a) - Design - Spam

We noticed that your app provides the same feature set as many of the other apps you
have submitted to the App Store, with only minor differences.

Next Steps
Since we do not accept spam apps on the App Store, we encourage you to review your app
concept and submit a unique app with distinct content and functionality.
```

Project: a gym chain's class booking app, one codebase, six branded builds.

### Output

**Parsed.** Apple, 4.3(a). Not a config fix: the app structure is the cause.

**Cause.** One app shipped as six bundle IDs that differ only in branding and location.

**Where.**
- `app.config.ts:5` reads `process.env.BRAND` and loads `brands/<brand>/config.json`.
- `brands/` holds `leeds`, `york`, `hull`, `bradford`, `sheffield`, `wakefield`, each with its own `bundleIdentifier`, name and icon. Screens and features are identical.

**Fix.**
- Per the guideline's fix (https://developer.apple.com/app-store/review/guidelines/): one app. With the user, merged into a single "FitHub" app with one bundle ID. A gym picker on first launch (and in Settings) loads the location's timetable from the existing API.
- Removed `BRAND` switching from `app.config.ts`; kept the brand assets for the picker.
- No paid variants, so no IAP needed for the merge.
- The other five apps: told the user not to submit them, and to decide whether any already live should be removed from sale. That is their call in App Store Connect.
- New build under the existing Leeds app record, renamed in metadata to FitHub (via `store-listing`).

**Reply.**

```
Hi,

You were right that these were the same app (Guideline 4.3(a)). We have merged the six location apps into this one and will not submit the others.

1. On first launch, choose a gym from the list.
2. The Classes tab shows that gym's timetable. Tap a class, then Book.
3. Change gym any time in Settings > My gym.

Build 31 contains the merged app.

Sam
```

If the user disagrees that the apps are the same: the reply explains, specifically, what each app does that the others do not. If they still disagree after that, the route is the App Review Board, not another reply.

---

## 4. Google Play: Data safety does not match the app

### Input

```
Issue found: Invalid Data safety form

Your app collects or shares the following user data types that are not disclosed in
your Data safety form:
- Approximate location
- Device or other IDs

Affected version code: 27

Action required: update your Data safety form to accurately reflect your app's data
collection and sharing, then resubmit.
```

Project: Pocket Recipes, Expo app, Android only. Recipes and an ads SDK.

### Output

**Parsed.** Google Play, Data safety (https://support.google.com/googleplay/android-developer/answer/10787469). The form must include data collected by SDKs. Inaccurate forms can block updates or remove the app.

**Cause.** The form covers what the app's own code collects, but not what the ads SDK collects.

**Where.**
- `package.json` includes `@acme/ads-sdk` (the example SDK). Its data disclosure page, which the user opened and pasted, says it collects approximate location and an advertising ID, and shares them for advertising.
- `store/data-safety.android.md` lists only email and recipe content.
- The app itself requests no location permission; the SDK's location comes from IP address, per its disclosure page.

**Fix.**
- Asked the user: keep the ads SDK? They keep it.
- Updated `store/data-safety.android.md` through `play-data-safety`: both data types collected and shared, purpose advertising, as the SDK's page describes.
- No code change, so no new versionCode for this fix.
- Console steps for the user: Play Console > App content > Data safety, enter the answers from `store/data-safety.android.md`, save, then send the changes for review as Play Console prompts.

**Reply.** None needed: Play is answered by fixing the form. No appeal, because the email is right. If the user had removed the SDK instead, the path would be a new release with version code 28 and a form without those types.

If the email had been wrong (the SDK was removed in version 27), the appeal text would be:

```
Pocket Recipes, package com.pocketrecipes.app, version code 27.

The email says the app collects approximate location and device IDs that the Data safety form does not disclose.

Version 27 no longer includes the ads SDK that collected them; it was removed in this release, and the app requests no location permission. The form is accurate for version 27.

Please review the decision.
```
