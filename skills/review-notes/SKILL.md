---
name: review-notes
description: Writes App Store review notes and Google Play app access instructions so reviewers can get past the login and find every feature - a demo account for every role, how two-factor authentication works for the reviewer, an expired-subscription account for auto-renewable subscriptions, exact steps to each new or non-obvious feature, the app's purpose and audience, tested devices, external services, hardware and region dependencies, and in-app purchases that cannot be reviewed - within Apple's 4,000-byte limit. Use when the user asks for review notes, notes for the reviewer, App Review Information, a demo account or test account for Apple or Google, Play Console app access or sign-in details, or after a guideline 2.1 rejection for a missing login, demo account or unreachable feature. Produces store/review-notes.txt and store/app-access.android.txt.
license: MIT
---

# review-notes

Use this skill before every submission that adds features or changes sign-in, and after any rejection that says the reviewer could not log in, could not find a feature, or could not test a purchase.

It produces, in the user's project:

- `store/review-notes.txt`: the text pasted into App Store Connect's Review Notes, 4,000 bytes or less.
- `store/app-access.android.txt`: the same information shaped for Play Console's sign-in details on the App content page.

Apple's requirements, with URLs, are in [references/apple.md](references/apple.md). Play's are in [references/play.md](references/play.md). The structure to fill is [assets/review-notes-template.txt](assets/review-notes-template.txt).

Why this matters: guideline 2.1 (app completeness) accounts for over 40% of unresolved App Review issues, and a missing or expired demo login and unreviewable purchases are among its listed triggers.

## 1. Find what a reviewer has to get through

Read the code for:

1. **Sign-in.** Every way in: email and password, magic link, phone/SMS code, social login, Sign in with Apple, SSO. Whether sign-in is required to see anything. Then find where accounts live: on a server (an auth provider or the project's backend) or only on the device (a profile in AsyncStorage, SecureStore, SQLite or files, with no network call). This decides which template block you use.
   - **Trace a fresh install.** Read the sign-in and sign-up code as a reviewer on a new device with no data would hit it: what does `signIn` do when no account exists on this device? What does the first screen show? If signing in fails until an account is created ("No account found"), the notes must say "Create an account first" with the steps. Do not rely on the user's summary ("any password works"); confirm it in the code, file and line.
2. **Two-factor or one-time codes.** Where codes are sent (SMS, email, authenticator) and whether the backend has a way to make them work for a test account.
3. **Roles.** Every user type with different screens or permissions: member, admin, coach, seller, buyer, parent, child, moderator. Look at role checks in the code and in the backend schema.
4. **Subscriptions and purchases.** Products, what each unlocks, where the paywall is, and anything that cannot be bought in review: codes from partners, enterprise licenses, physical-world redemption.
5. **Features not visible on the first screen.** Anything behind a gesture, a settings toggle, a role, a location or a paid tier that a user of this build can reach. Each one goes in the notes with the steps to reach it.
   - **Switched off in this build.** Code turned off by a server flag, remote config, date or region switch is a different case. Apple's 2.5.19 forbids hidden, dormant or undocumented features, and describing one in the notes does not make it allowed. Stop and tell the user: remove it from the submitted build, or make it available to users before submitting. Do not write it into the notes as a fix.
6. **New in this version.** Diff against the last released tag or ask. These need exact steps (2.3.1(a): describe new features specifically).
7. **Dependencies on the outside world.** Hardware (Bluetooth devices, NFC tags, car, wearable, specific camera), region (content only in some countries, geofenced features), time (events, schedules), another account (a partner app, a school, an employer).
8. **External services.** The services the core features depend on: auth provider, payment processor, data provider, AI service. Apple asks for this list. Take them from the dependencies and the network calls.
9. **Account deletion path.** Where the user starts deleting their account in the app.

If the store-listing skill wrote a feature inventory, start from it.

## 2. Ask the user once

Ask, in one message, for what only they can provide:

- A demo account for every role you found, on the production backend this build talks to, with data already in it. If they do not have one, say exactly which accounts to create and what data each needs. Skip this for device-local accounts: there is no server account to give, so the notes tell the reviewer how to create one on their device (step 4).
- If the app offers auto-renewable subscriptions: an account whose subscription has expired, so the reviewer can go through the whole purchase flow.
- The device models and OS versions they tested this build on. Apple asks for it. You cannot know it from the code; never fill it in yourself.
- For a new app: the business model (free, paid, subscriptions, ads), and who the app is for, if the code does not make it clear.
- How a reviewer gets past two-factor authentication on those accounts (codes off for demo accounts, a fixed code for demo accounts only, or an inbox the reviewer can open).
- For hardware-dependent features: a video of the app running on a real device with the hardware. Apple asks for it; you cannot make it.
- For region-dependent content: how a reviewer outside that region can see it.
- A contact for the reviewer: name, email, phone, time zone.

Do not create real accounts on their production backend yourself, and do not guess passwords. A demo mode in place of a demo account is allowed only with Apple's prior approval; do not suggest one as a shortcut.

## 3. Keep credentials out of version control

Never write a real password into a file in the project. Both files use placeholders such as `{{PASSWORD_MEMBER}}`; the user types the real values into the console fields when pasting. Measure with the real lengths in mind: leave at least 100 bytes of margin.

Adding a file to `.gitignore` does not protect it: a file git already tracks stays tracked, and anything committed stays in history. If you find real credentials already in a tracked file or in the history, tell the user to:

1. Replace them with placeholders and stop tracking the file (`git rm --cached <file>`).
2. Change those passwords on the backend, since anyone with the repository has them.
3. If the repository is shared or public, remove them from the history too, or treat them as exposed for good.

Never tell the user the credentials are safe because a file name is in `.gitignore`.

## 4. Write `store/review-notes.txt`

Fill [assets/review-notes-template.txt](assets/review-notes-template.txt). Rules:

- Plain ASCII. Straight quotes, hyphens, `>` for navigation. Non-ASCII characters cost 2 to 4 bytes each.
- One demo account per role, each with what that role can see. The expired-subscription account is its own entry.
- Device-local accounts: use the "DEMO ACCOUNTS (device-local)" block of the template instead. Never write "production server" or "accounts do not expire" when there is no server. Give the exact sign-up steps and example values the reviewer can type, say that data stays on the device, and say what the reviewer sees right after signing up (an empty list, sample data).
- Every URL in the notes (a video link, the web deletion page, a support page) must load: open it and confirm a 200 before writing it in. A link that does not load is a 2.1 broken link; tell the user to publish it, and leave it out until it loads.
- The 2FA section says exactly what the reviewer does after entering the password. "Use the code sent to the email" is not enough unless the reviewer can open that inbox.
- Steps are taps, in order, using the UI's own labels: `Home > tap a habit > Month`. Not "navigate to the habit details".
- New features first, then other non-obvious features, then account deletion.
- APP PURPOSE AND AUDIENCE, EXTERNAL SERVICES and REGIONAL AVAILABILITY are short facts, one line each where possible. If there are no regional differences, say the app works the same in every region. TESTED DEVICES comes from the user only; until they answer, leave the `{{TESTED_DEVICES}}` placeholder and list it in the report.
- Purchases: where each product is, what it unlocks, and for each one that cannot be bought in review, why and how the reviewer can see what it unlocks (2.1(b)).
- Hardware: name the device, say the video is attached (or give its link). Region: say how to see the content from anywhere.
- No marketing. The reviewer needs instructions, not reasons to like the app.
- No promises about what the app will do later, and no features that are not in this build.

Delete every template section that does not apply, rather than leaving it empty.

## 5. Write `store/app-access.android.txt`

Play Console's App content page has a sign-in details section for parts of the app that need sign-in (https://support.google.com/googleplay/android-developer/answer/9859455). Our sources do not list its exact fields; read them in the Console.

Write the same accounts and steps as the Apple notes, split so each piece can be pasted into its own field:

```
CREDENTIAL SET 1: <Role>
Username: <...>
Password: {{PASSWORD_...}}
Instructions: <2FA path, then the steps to the main restricted features>

CREDENTIAL SET 2: <Role>
...

OTHER INSTRUCTIONS
<Hardware, region, purchases that cannot be tested>
```

Leave out anything iOS-specific (Sign in with Apple paths, TestFlight), and add Android-only paths if they differ. For device-local accounts, put the sign-up steps in Instructions; if the Console's fields need a username and password, give the example values from those steps and say the account is created on the device. Background location, foreground service and other permission declarations have their own forms and videos; leave them to the play-data-safety skill. Background location declarations also need test credentials if login is needed; use the same accounts.

## 6. Measure

Count bytes, not characters. From the project root:

```
node -e "const b=require('fs').readFileSync('store/review-notes.txt');console.log(b.length+' / 4000 bytes');process.exit(b.length>4000?1:0)"
```

This works in bash, zsh and PowerShell. It counts the file as saved, including line endings and any byte-order mark, which is what the field receives. If the file has a byte-order mark, save it as UTF-8 without one.

If it is over 4,000 bytes: cut marketing first, then merge steps that share a path, then shorten role descriptions. Never cut a demo account, the 2FA path, or a new feature.

## 7. Report

Tell the user:

- Where to paste each file: App Store Connect, the version's App Review Information; Play Console, App content, sign-in details.
- Which placeholders they must replace (passwords, `{{TESTED_DEVICES}}`), and the byte margin left for them.
- Which accounts they still need to create, with the data each needs.
- To sign in with every demo account on a release build the day they submit, because an expired or broken demo login is a 2.1 rejection.

## Verify

- [ ] The byte count command prints 4000 or less for `store/review-notes.txt`, with at least 100 bytes of margin if it contains placeholders.
- [ ] Every role found in the code has a demo account entry, in both files.
- [ ] You traced sign-in on a fresh install in the code. If it fails before an account exists, both files say to create the account first, with the steps.
- [ ] For device-local accounts, neither file mentions a production server, and the sign-up steps use labels from the code.
- [ ] Every URL in either file was opened today and loaded.
- [ ] Apps with auto-renewable subscriptions have an expired-subscription account.
- [ ] No feature switched off in this build by a flag, date or region is described as a fix; the user was told to remove it or make it available.
- [ ] Purpose and audience, tested devices (from the user or a placeholder), external services and regional availability are in the notes.
- [ ] The 2FA section says exactly what the reviewer does after the password.
- [ ] Every new feature in this version has tap-by-tap steps, using labels that appear in the code's UI strings.
- [ ] Every purchase that cannot be bought in review has an explanation.
- [ ] Every hardware dependency mentions the real-device video.
- [ ] Neither file contains a real password; only placeholders.
- [ ] The file is plain ASCII. This prints any character that is not:
  ```
  node -e "const s=require('fs').readFileSync('store/review-notes.txt','utf8');const m=[...s.matchAll(/[^\x00-\x7F]/g)].map(x=>x[0]);console.log(m.length?'non-ASCII: '+m.join(' '):'ASCII only')"
  ```
