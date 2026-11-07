---
name: store-listing
description: Writes the App Store and Google Play listing text for a mobile app from what the code actually does - app name, subtitle, keywords, promotional text, app description, what's new, Play title, short description and full description - and checks every field against the store limits (Apple keywords counted in bytes). Use when the user asks for an App Store description, app description, keywords, ASO, subtitle, store listing, Play Store description, short description, "what's new" text, or wants listing copy fixed after a metadata rejection (guideline 2.3, 2.3.7, 2.3.10). Produces store/listing.ios.json and store/listing.android.json.
license: MIT
---

# store-listing

Use this skill when the app needs listing text for App Store Connect, Play Console, or both, or when existing listing text was rejected or runs over a limit.

It produces two files in the user's project, in the exact shapes the store-ready checker validates:

- `store/listing.ios.json`
- `store/listing.android.json`

Limits and rules, each with its source URL, are in [references/limits-and-rules.md](references/limits-and-rules.md). How to write each field, with examples, is in [references/writing-guide.md](references/writing-guide.md). Read both before writing.

## 1. Learn what the app does from the code

The README and the user's pitch describe what the app should do. Reviewers check what it does. Build the listing from the build.

Read, in this order:

1. App config: `app.json` / `app.config.*` (Expo), `Info.plist` and the Xcode target (iOS), `AndroidManifest.xml` and `build.gradle*` (Android). Note the display name, bundle ID, whether iPad is supported, and declared permissions.
2. Navigation and screens: the router directory (`app/` for Expo Router), navigator definitions, or the storyboard / activity list. List every screen a user can reach.
3. For each screen, what the user can do there: the buttons, forms and actions, in the UI's own words. Read the string literals and translation files.
4. Paywalls, subscriptions and in-app purchases: what is free, what is paid. You need this to describe paid features honestly; prices never go in the text.
5. Integrations the user sees: sign-in providers, sync, widgets, notifications, health or calendar access, sharing.
6. Anything behind a feature flag, a "coming soon" label, or a disabled route. Treat it as not shipped.

Write a short feature inventory before drafting, one line per feature with the file that proves it:

```
- Create a habit with a name, icon and daily target   app/(tabs)/new.tsx
- Mark today's habits done from the home list         app/(tabs)/index.tsx
- Weekly streak chart                                 components/StreakChart.tsx
- Optional reminder notification per habit            lib/reminders.ts
- Pro: unlimited habits (free tier capped at 3)       lib/paywall.ts
```

Every claim in the listing must map to a line in this inventory. If a feature is not in the inventory, it does not go in the listing (guideline 2.3.1(a)). Keep the inventory: the review-notes skill uses it, and Apple's 2.5.19 forbids hidden or undocumented features.

## 2. Ask the user once

Ask only what the code cannot tell you, all in one message:

- The store name they want, if it differs from the display name in config. Before asking, search the App Store and Google Play for that name (or ask the user to, if you cannot open the stores) and tell them what you found; `app-review-risk` records a clash under 4.1. Checking trademarks is theirs to do.
- Which stores this listing is for (App Store, Google Play, both).
- For an update: what changed in this version, if the git history does not make it clear.

Do not ask about tone, audience or "selling points". Those come from the inventory.

## 3. Draft the fields

Draft in this order, because later fields depend on earlier ones.

**Apple**

1. `name` (2–30 characters). The app's name, optionally followed by a short plain descriptor. No keyword lists, no prices, no trademarks you do not own (2.3.7).
2. `subtitle` (30 characters). What the user does with the app, as a verb phrase. Do not repeat the name.
3. `keywords` (100 bytes). Comma-separated, no space after commas, no words already in the name, no other app or company names. See the byte rules in the writing guide.
4. `description` (4,000 characters, plain text). First sentence says what the user can do. Then features, grouped, in the order the user meets them. Then what is free and what needs a subscription, without prices. Then a support line if the app has a support page.
5. `promotionalText` (170 characters). Editable without a new version, so use it for the most recent or most useful thing, still factual.
6. `whatsNew` (4,000 characters). For an update: the user-visible changes in this version, one per line. For a first release, write a single factual line or leave it empty if App Store Connect does not show the field for that version.

**Google Play**

1. `title` (30 characters). Usually the same as the Apple name.
2. `shortDescription` (80 characters). One sentence on what the user can do.
3. `fullDescription` (4,000 characters). Same structure as the Apple description. Do not pad it with repeated terms: Google treats keyword stuffing as a policy violation that can lead to suspension.

## 4. Check against the rules

Before writing the files, go through each field and remove:

- Superlatives and rankings: best, #1, ultimate, revolutionary, leading, fastest, top-rated, "the only".
- Claims you cannot prove from the code or a source the user can show: user counts, ratings, awards, "trusted by", "loved by", medical or financial outcomes.
- Prices, discounts and "free" in the name, subtitle or title (2.3.7, 2.3.14). Describe what is included in a plan, not what it costs.
- Emoji, unless the user asked for them.
- Other platforms' names in the Apple listing: Android, Google Play (2.3.10).
- Other apps', companies' or brands' names in keywords, and anywhere else unless it is a real, working integration the user owns the right to name (2.3.7, keywords rule).
- Features that are not in the inventory, or are only planned (2.3.1(a)).
- Text that is not suitable for all audiences (2.3.14), even if the app itself is rated higher.

## 5. Write the files

Write these keys. Use `""` for a field you are leaving empty.

`store/listing.ios.json`
```json
{ "name": "", "subtitle": "", "keywords": "", "promotionalText": "", "description": "", "whatsNew": "" }
```

`store/listing.android.json`
```json
{ "title": "", "shortDescription": "", "fullDescription": "" }
```

Add these console fields when you have them. They are not measured text, but the checker reads them:

- Both files: `"privacyPolicyUrl": "https://..."`. Both consoles ask for it; the checker also accepts app config `extra` and a URL in source.
- `store/listing.ios.json`: `"supportUrl"` (required by App Store Connect; it "must lead to actual contact information" so users can reach you, https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information), optional `"marketingUrl"`, and `"primaryCategory"` / `"secondaryCategory"` (https://developer.apple.com/help/app-store-connect/reference/app-information/app-information).
- `store/listing.android.json`: `"category"` and `"tags"`, a list of at most 5 (https://support.google.com/googleplay/android-developer/answer/9859673).

Choose categories from the feature inventory: the category that matches what most of the inventory does. Read the category list in each console and use its names exactly. Picking Health & Fitness or Medical on Apple means a regulated medical device declaration (see `submission-checklist`), so say so to the user when you suggest it. If the project has no support page, ask the user for one; do not invent a URL.

Open the URL before writing it, in a browser or with `node -e "fetch(process.argv[1]).then(r=>console.log(r.status,r.url),e=>console.log('failed',e.message))" <url>`. JSON has no place for a note, so tell the user the status and the date in your report. If it does not load, still write it (the checker needs it), but report it as blocking: the user must publish the page before submitting. `npx store-ready check --verify-urls` checks it again later.

Write paragraphs inside a description as `\n\n` and list lines as `\n`. Use a hyphen and a space for list items; do not use Markdown headings or bold, because both fields are plain text.

If only one store is in scope, write only that file.

## 6. Measure

Run the measuring script from the project root:

```
node <this-skill>/scripts/measure.mjs
```

`<this-skill>` is the folder that contains this SKILL.md. Replace it with that folder's full path before running the command; never type `<this-skill>` into a shell, and do not assume the skill sits inside the user's project. Most agents show the folder when they load a skill. If yours does not, search the installed skills for the script's file name.

or pass the project root as the first argument. It prints every field's length against its limit (characters, and bytes for keywords), warns about spaces after commas, duplicate keywords, keywords already in the name, superlatives, emoji, prices and other platforms' names, and exits 1 if a field is over its limit, the name is missing or under 2 characters, a field is not a string, or a file is not valid JSON. Empty or missing required fields are warnings, because a draft can be measured before it is finished.

Fix every error. Treat every warning as a change to make unless you can say why it does not apply; the script's word lists are heuristics, the rules in `references/limits-and-rules.md` are the source.

The store-ready checker applies price and superlative words to `name`, `subtitle` and `title` only; this script checks every field, so a description can warn here and pass the checker. For the short fields there is no exception: rename. In descriptions, a word can be part of a label the UI really shows (a stat tile called "Best streak"), which the writing guide says to name as the UI names it. Then pass the label, and only labels found in the code:

```
node <this-skill>/scripts/measure.mjs --allow "best streak"
```

The script prints a `note` for each accepted use instead of a warning. Give the user each allowed label and the file that shows it.

Characters are counted as Unicode code points. If the script notes that a field has characters outside the Basic Multilingual Plane (most emoji), the console may count them differently; keep at least 5 characters of margin on that field.

## 7. Report

Tell the user:

- Where the files are and that they paste each field into App Store Connect (app information and version information) and Play Console (main store listing).
- The feature inventory, so they can strike anything that should not be claimed.
- Which fields are near their limit.
- That the listing passes the checks we know about. Never say it will be approved.

## Verify

- [ ] `node <this-skill>/scripts/measure.mjs` exits 0 and you have read every warning. Every `--allow` label appears in the app's UI strings, and you named the file.
- [ ] The privacy policy URL, if written, was opened today; the user knows its status.
- [ ] Both JSON files parse and contain exactly the keys shown in step 5, plus `privacyPolicyUrl` if the app has one.
- [ ] Every feature named in a description maps to a line in the feature inventory with a file path.
- [ ] No price, currency symbol or "free" in `name`, `subtitle` or `title`.
- [ ] No other app, company or platform name in `keywords`; no "Android" or "Google Play" anywhere in the iOS listing.
- [ ] The first sentence of each description says what the user can do.
- [ ] If the project has the store-ready checker, `npx store-ready check` reports no listing errors.
