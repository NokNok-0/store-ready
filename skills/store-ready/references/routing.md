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
| Privacy policy URL not configured | both | ios-privacy (iOS), play-data-safety (Android); ask the user for the URL once |
| Listing field over its limit, keywords over 100 bytes | both | store-listing |
| Screenshot size or format wrong | both | store-screenshots |

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
