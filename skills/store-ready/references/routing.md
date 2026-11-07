# Routing

## Files under `store/` and who writes them

| File | Written by | Needed for |
|---|---|---|
| `store/review-risks.md` | app-review-risk, mock-review | both |
| `store/privacy.ios.md` | ios-privacy | iOS |
| `store/data-safety.android.md` | play-data-safety | Android |
| `store/age-rating.md` | age-rating | both |
| `store/listing.ios.json` | store-listing | iOS |
| `store/listing.android.json` | store-listing | Android |
| `store/screenshots/plan.md` | store-screenshots | both |
| `store/screenshots/capture.json`, its seed file (web capture only, optional) | store-screenshots | both |
| `store/screenshots/ios/iphone/`, `ios/ipad/` | store-screenshots | iOS |
| `store/screenshots/android/phone/`, `android/tablet/`, `android/feature-graphic/`, `android/icon/` | store-screenshots | Android |
| `store/review-notes.txt` | review-notes | iOS |
| `store/app-access.android.txt` | review-notes | Android |
| `store/checklist.md` | submission-checklist | both |

`login-and-payments` and `account-deletion` change code rather than write a `store/` file. Treat them as done when the checker raises no login or deletion warnings and `store/review-risks.md` has no open finding against 4.8, 3.1.1 or account deletion.

## Checker topics to skills

The checker's v1 checks and the skill that fixes each. Route by `id` if it names the topic, otherwise by `message`.

| Checker topic | Platform | Skill |
|---|---|---|
| Purpose string missing or not specific for a requested permission | ios | ios-privacy |
| Privacy manifest missing a required-reason API category, or invalid reason code | ios | ios-privacy |
| Declared Android permission that needs a Play declaration | android | play-data-safety |
| Target SDK below 36 | android | play-data-safety |
| Bundle identifier, package, version or build number missing | both | fix directly in app config or the native project |
| App icon missing or wrong size | both | fix directly; requirements in [facts.md](facts.md) |
| Sign-up found without an account deletion path | both | account-deletion |
| Third-party login without Sign in with Apple or an equivalent | ios | login-and-payments |
| Privacy policy URL not configured (`privacy.policy-url`) | both | Ask the user for the URL once. The checker accepts `privacyPolicyUrl` in `store/listing.*.json`, a URL in app config `extra`, or one in source; store-listing writes it into the listing files, and ios-privacy (iOS) and play-data-safety (Android) record it and check it loads. The app also needs an in-app link (ios-privacy step 6) |
| URL "found, not verified" (privacy policy, support, deletion page) | both | The skill that records that URL opens it: ios-privacy and play-data-safety (privacy policy), account-deletion (deletion page), submission-checklist (support URL). Or run `npx @noknok-0/store-ready check --verify-urls`. A URL that does not load is blocking until the user publishes the page |
| Template or placeholder content (`app.template-content`): Expo template icons, `example.com`, lorem ipsum, "coming soon", "not available yet" | both | app-review-risk (area A9) |
| Purpose string is a config plugin's default (`ios.purpose-strings`) | ios | ios-privacy |
| Privacy manifest reasons declared by a dependency's `PrivacyInfo.xcprivacy` but not in app config (`ios.privacy-manifest`) | ios | ios-privacy |
| Sign-up found but no visible deletion screen or button (`account.deletion`) | both | account-deletion |
| Listing field over its limit, keywords over 100 bytes | both | store-listing |
| Price or superlative word in the name, subtitle or title | both | store-listing |
| Screenshot size or format wrong | both | store-screenshots |
| `store/` files found and missing (`store.files`, info) | both | No fix; use it for the stage in step 2 of SKILL.md, then check the files yourself |

An issue that fits none of these: show it in the report with its `fix` text and `source` URL, and say no skill owns it.

## Stage by store folder

| `store/` state | Stage | Start with |
|---|---|---|
| Missing | New | app-review-risk |
| Some files | Partial | First skill in the order whose output is missing or stale |
| All files for the stores in scope, checker clean | Ready | Fast path |
| User has a rejection | Rejected | rejection-fix, then mock-review |

## Order, condensed

app-review-risk → login-and-payments → account-deletion → ios-privacy → play-data-safety → age-rating → store-listing → store-screenshots → review-notes → submission-checklist → mock-review

For a new personal Play account, move play-data-safety up to run right after account-deletion is decided (it needs the deletion URL), so the closed test can start early.
