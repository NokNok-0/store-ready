---
name: rejection-fix
description: 'Turns an App Store rejection or a Google Play policy rejection into a fix and a reply. Use when the user pastes a message from App Store Connect or a Play Console policy email, or says "App Store rejected my app", "Apple rejected my app", "my app was rejected", "Guideline 2.1", "Guideline 2.1 demo account", "Guideline 5.1.1(v) account deletion", "Guideline 4.3 spam", "Guideline 4.8", "Guideline 3.1.1", "Play Console policy violation", "Google Play rejected my update", "Data safety form does not match", "how do I reply to App Review", or "should I appeal". Parses each guideline or policy, maps it to the cause, finds the cause in the project, fixes it or lists the exact console changes, and drafts a short, specific reply to App Review, or the Play resubmission or appeal steps.'
license: MIT
---

# rejection-fix

Use this when a real rejection or policy email has arrived. It ends in two things: the project (or the console) changed so the cause is gone, and the text the user pastes back to Apple or the steps they take in Play Console.

Mappings from guideline or policy to cause and fix:
- Apple: [references/apple.md](references/apple.md)
- Google Play: [references/play.md](references/play.md)

Reply rules, structure and the Play path: [references/replies.md](references/replies.md). Four worked examples (2.1 demo account, 5.1.1(v) account deletion, 4.3(a) spam, Play Data safety mismatch): [references/examples.md](references/examples.md). Read the examples once before your first draft; they show the expected depth and tone.

Store rules come only from these files. If the rejection cites something they do not cover, open the official page given there, read the section, and work from its text. Do not explain a guideline from memory.

## 1. Get the whole message

Ask the user, once, for anything missing:

- The full text, not a summary. Every guideline number in it matters; one message can cite several.
- Any attachments or screenshots the reviewer included, and the device and OS version they mention.
- The build number (Apple) or version code (Play) that was rejected.
- Whether this is a first rejection or a repeat for the same issue.

## 2. Parse

For each issue in the message, write down:

- Store and identifier: `Guideline 5.1.1(v)`, or the Play policy name and the "issue found" line.
- What the reviewer did and what stopped them, in one sentence.
- What they ask for under "Next Steps" or "Action required".
- Whether it concerns the binary, the metadata, review notes, or the account.

If the message asks questions rather than rejecting (the reviewer wants information), the output is answers to each question, in order, in the reply. Still check the project so the answers are accurate.

## 3. Map to a cause

Look up each identifier in [references/apple.md](references/apple.md) or [references/play.md](references/play.md). Each entry lists usual causes, where to look, the fix, the skill that owns the fix, and whether a new build is needed.

Pick the cause that the reviewer's sentence describes. If several causes fit, check each in the project before choosing. If none fits, say so and read the guideline or policy text in full.

## 4. Find it in the project

Search where the entry says to look. Record path and line for each piece of evidence. Typical places:

- Auth guards, roles, 2FA screens; `store/review-notes.txt`.
- App config: `ios.infoPlist`, `android.permissions`, plugins, `bundleIdentifier`, build number; `Info.plist`, `AndroidManifest.xml`, Gradle.
- `package.json` and native dependency files for SDKs.
- Settings screens for deletion, privacy policy links, restore purchases.
- `store/` files for metadata, screenshots, privacy and data safety answers.

Some causes are not in the repository: a demo account on the server, a console field, an account type. Say exactly that and what the user must check.

## 5. Fix

Fix every issue in the message before drafting anything.

- Code or config cause: make the change by following the owning skill named in the mapping (`account-deletion`, `login-and-payments`, `ios-privacy`, `play-data-safety`, `review-notes`, `store-listing`, `store-screenshots`, `age-rating`). Match the project's style.
- New build needed: raise the iOS build number or Android versionCode. Every upload needs a new one (https://docs.expo.dev/submit/introduction/).
- Console cause: list the exact steps for the user: which console, which page, which field, what to enter. You do not change consoles; the user does.
- Product cause (4.2, 4.3, Play minimum functionality): say plainly that it is not a config fix. Propose the concrete change from the mapping and agree it with the user before building.
- If the fix touches anything both stores read (deletion, data collected, listing claims), update the other store's files too, so the next review there does not fail on the same thing.

Then run:

```
npx @noknok-0/store-ready check --json
```

The exit code is 1 when errors remain; read the output and confirm no error relates to the rejection. If the checker cannot run, say so.

## 6. Decide: reply, call, appeal

**Apple** (rules in [references/replies.md](references/replies.md), from https://developer.apple.com/help/app-review/after-submitting-for-review/contact-app-review):

- The fix is done, or the reviewer missed something that is there: **reply** in App Store Connect with "Reply to App Review". Specific: the feature, the guideline, the steps. This is not an appeal.
- The reviewer misunderstood how the app works: reply, explain the concept, give steps.
- The issue repeats after a clear reply, or is hard to explain in writing: the user can **request a call**, with their time zone. Calls take 3–5 business days.
- The user believes the guideline was applied wrongly and explaining did not resolve it: **App Review Board**. Never put an appeal in the reply. Do not ask for expedited review in the reply.

**Google Play** (path in [references/replies.md](references/replies.md)):

- The email is right: fix the app and the declarations, upload a fixed release if code changed, and resubmit as the email and Play Console direct. No message is needed.
- The email is wrong (the flagged behaviour is not in the release): appeal through the link in the email or Play Console, using the appeal structure in the replies file. Our sources do not document the appeal steps; read the Enforcement section of https://play.google/developer-content-policy/.
- On a repeat, remind the user that repeated violations can lead to account suspension (https://support.google.com/googleplay/android-developer/answer/2477981).

## 7. Draft the reply

Follow the structure in [references/replies.md](references/replies.md):

- Open with what was wrong and what changed, naming the guideline once.
- Numbered steps to see the fix, with on-screen labels copied from the code.
- The build number to review, if there is a new build.
- Short. No apology formulas, no "fully compliant", no promises, no request to expedite.

Write it as a person who fixed the problem would: plain, specific, done. Put it in a code block so the user can paste it.

## 8. Hand over

Give the user, in this order:

1. What caused the rejection, in one or two sentences, with the evidence paths.
2. What you changed (files) and what they must change (console steps), as a short list.
3. Whether a new build is needed, and its build number or versionCode.
4. The reply or appeal text, or "no reply needed" for a Play fix.
5. What to test before resubmitting: the exact flow the reviewer will follow, on a fresh install of the release build.

Suggest running `mock-review` before resubmitting when the fix touched more than one area, or when this is a repeat rejection.

## Verify

- Every guideline or policy in the message has a cause, evidence (or a stated reason it is outside the repository), and a fix.
- Every guideline number and policy name you wrote appears in the user's message and in the mapping files, or you read the official page for it.
- `npx @noknok-0/store-ready check --json` shows no error related to the rejection.
- If code changed, the build number or versionCode is higher than the rejected one.
- Every step in the reply names a screen or button that exists in the code with that exact label.
- The reply contains no apology formula, no request to expedite, no appeal language, and no claim the app "complies" or "will be approved". Apple replies are under 150 words for a fix, 250 for an explanation.
- For Play, the `store/data-safety.android.md` or other declaration files match the release being submitted.
