# Finding format

## Apple headers

`Guideline <number> - <Section> - <Topic>`

Section is the top-level section of the guidelines: 1 Safety, 2 Performance, 3 Business, 4 Design, 5 Legal (https://developer.apple.com/app-store/review/guidelines/).

Topic is the short name from our sources. Apple's own messages may use longer subsection titles. Use this table; for a guideline not in it, copy the subsection title from the guidelines page rather than making one up.

| Guideline | Header |
|---|---|
| 1.2 | Guideline 1.2 - Safety - User-Generated Content |
| 1.5 | Guideline 1.5 - Safety - Developer Information |
| 2.1 | Guideline 2.1 - Performance - App Completeness |
| 2.3, 2.3.1(a), 2.3.7, 2.3.10 | Guideline 2.3.x - Performance - Accurate Metadata |
| 2.3.3 | Guideline 2.3.3 - Performance - Accurate Metadata |
| 2.3.14 | Guideline 2.3.14 - Performance - Creative Assets |
| 2.5.2 | Guideline 2.5.2 - Performance - Downloaded Code |
| 2.5.19 | Guideline 2.5.19 - Performance - Hidden Features |
| 3.1.1 | Guideline 3.1.1 - Business - In-App Purchase |
| 4.1 | Guideline 4.1 - Design - Copycats |
| 4.2 | Guideline 4.2 - Design - Minimum Functionality |
| 4.3(a), 4.3(b) | Guideline 4.3(x) - Design - Spam |
| 4.8 | Guideline 4.8 - Design - Login Services |
| 5.1.1(i) | Guideline 5.1.1(i) - Legal - Privacy Policy |
| 5.1.1(ii) | Guideline 5.1.1(ii) - Legal - Purpose Strings |
| 5.1.1(v) | Guideline 5.1.1(v) - Legal - Account Deletion |
| 5.1.2(i) | Guideline 5.1.2(i) - Legal - Data Sharing |

Use the most specific number the finding rests on: 2.3.7 for a name with a price in it, not 2.3.

## Google Play headers

`Google Play - <Policy area> - <Topic>`

Policy areas are the top-level areas of https://play.google/developer-content-policy/. Topics come from the help pages in our sources.

| Check | Header |
|---|---|
| Data safety | Google Play - Data safety |
| Account deletion | Google Play - Account deletion |
| Permissions | Google Play - Permissions - <permission name> |
| Target API | Google Play - Target API Level |
| Minimum functionality | Google Play - Spam, Functionality, and User Experience - Minimum functionality |
| Listing text and graphics | Google Play - Store Listing and Promotion - Metadata |
| Content rating | Google Play - Store Listing and Promotion - Content Ratings |

Permissions and Target API Level sit under "Privacy, Deception and Device Abuse" in the policy centre; the header leaves the parent out to stay short. Data safety and account deletion are named after their help pages, because our sources do not say which policy area they sit under.

## A finding

```markdown
#### Guideline 2.1 - Performance - App Completeness

Status: Blocking

Found
The app requires sign-in before any content is shown: `app/_layout.tsx:31` redirects to `/login` when there is no session. `store/review-notes.txt` contains no demo account. The app also has an `admin` role (`src/auth/roles.ts:4`) with its own screens under `app/(admin)/`; no account for that role is given either.

Next steps
Add two demo accounts to `store/review-notes.txt`: one regular user and one admin, each with username and password, and say which screens each unlocks. The app has a monthly subscription (`src/billing/products.ts:2`), so also add an account whose subscription has expired. Keep the file under 4,000 bytes.

Source: https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review
```

Rules:

- "Found" says what is in the files, with paths and lines. It reads like a reviewer who looked, not like a linter: what they tried to do and what stopped them, then the evidence.
- "Next steps" names the file to change and what it must contain. When the change is in a console (App Store Connect, Play Console), name the field.
- One finding per cause. If one missing account blocks three features, it is one finding.
- No praise, no "consider", no "it is recommended". Write "Add", "Remove", "Replace".
- Status is Blocking or Risk, as defined in [checks.md](checks.md).

## Not verified

```markdown
### Not verified

- Runtime: crashes, freezes and load failures cannot be seen from the files. Install the release build on a real iPhone and an Android phone, and walk sign-up, the main task, purchase and account deletion.
- Demo account: credentials are present but were not tried. Sign in with them on a fresh install.
- App Store Connect: privacy policy URL, App Privacy answers and IAP product status are entered in the console and were not visible.
- Play Console: Data safety form as submitted, and how reviewers get past sign-in.
```

Each line says what was not checked, why, and how the user checks it. Keep only lines that apply to this app.

## Section skeleton

```markdown
## Mock review 2026-11-07

Build: 1.2.0 (14), Expo SDK 58. Stores: iOS, Android.
Read: app config, `app/`, `src/`, `package.json`, `store/` (listing.ios.json, listing.android.json, review-notes.txt, screenshots/ios/iphone, screenshots/ios/ipad, screenshots/android, privacy.ios.md, data-safety.android.md).
Checker: 1 error, 2 warnings (included below as findings).

### Apple

#### Guideline 2.1 - Performance - App Completeness
...

### Google Play

#### Google Play - Account deletion
...

### Not verified
...

### Result

Blocking: 3. Risk: 2. Not verified: 4.
Fix first: add the demo accounts to review notes (2.1); without them the reviewer cannot reach anything else.
```

When there are no Blocking findings, the Result line reads: "No blocking findings. Passes the checks we know about; the items under Not verified still need a device test before submitting." Never write that the app will be approved.
