# Age rating answers

Prepared 2026-11-07 from the code at working tree (Streaks 1.0.0). Estimates, not results: each store computes the rating from the answers.

## Act now

- Apple's Shared Location and Dating & Relationships descriptors are required on submissions from 2026-11-16 (all apps by 2027-01-12). Neither applies to Streaks; answer both "No" in App Store Connect before the first submission.

## Facts found

| Topic | Finding | Evidence |
|---|---|---|
| User-generated content | not found: habit names and photos are created by the user but never shown to anyone else | `src/habit-store.ts`, `src/photos.ts` store locally; no upload or network call anywhere in `src/` |
| Chat | not found | `package.json` has no chat SDK; no messages model or socket code in `src/` |
| Social features | not found: no follow, feed, likes, public profiles or user search | `src/app/` routes: index, habit/[id], settings, about, delete-account, sign-in, sign-up |
| Location shared with other people | not found: no location library or code | `package.json`; search for `expo-location`, `geolocation` in `src/` returned nothing |
| Dating and relationships | not found | no matching, profiles or relationship fields in `src/` |
| Unrestricted web access | not found: no web view. Settings opens three fixed GitHub URLs (privacy policy, support, deletion page) in the system browser | `src/links.ts`, `src/app/settings.tsx`, `src/app/delete-account.tsx` |
| Gambling, contests, random rewards | not found | no such features in `src/` |
| Mature or sensitive themes | not found: bundled copy is habit-tracking text ("Pick something small you want to do every day, like a 10-minute walk.") and a flame emoji | `src/app/index.tsx`, `src/components/auth-screen.tsx`; no seed data or bundled media beyond icons |
| AI-generated content | not found | scan-deps `ai.packages` and `ai.hostsInSource` empty |
| Advertising | not found | no ad SDK in `package.json` |
| Purchases | not found: the Pro paywall stub was removed for 1.0 | `src/app/paywall.tsx` deleted; see `store/review-risks.md` L2 |
| Age collection and audience | not found: no birth date or age gate; the copy is not aimed at children | `src/components/auth-form.tsx` asks only email and password |

## Apple App Store Connect (age rating)

Estimated tier: 4+ (estimate)

| Topic | Suggested answer | Based on |
|---|---|---|
| Social-media capabilities | None apply | Facts: Social features, User-generated content, Chat |
| Shared Location | No | Facts: Location |
| Dating & Relationships | No | Facts: Dating |
| Unrestricted web access | No | Facts: Web access (fixed pages, opened outside the app) |
| User-generated content shared with others | No | Facts: User-generated content |
| Gambling and contests (real or simulated) | None | Facts: Gambling |
| Violence, sexual content, profanity, alcohol, tobacco, drugs, horror, medical information | None | Facts: Mature themes |
| In-app purchases | No | Facts: Purchases |
| Made for kids | No | Facts: Age and audience; confirm with the developer |

## Google Play (content rating, IARC)

| Topic | Suggested answer | Based on |
|---|---|---|
| Category | Utility, productivity, communication or other (not a game) | App purpose |
| Violence, fear, sexuality, language, controlled substances, crude humour | No | Facts: Mature themes |
| Users can interact or exchange content | No | Facts: User-generated content, Chat, Social |
| Shares user's current physical location with other users | No | Facts: Location |
| Digital purchases | No | Facts: Purchases |
| Gambling or simulated gambling | No | Facts: Gambling |
| Unrestricted internet access | No | Facts: Web access |

Retake this questionnaire whenever the app's content changes.

## Google Play (ads and target audience)
Contains ads: No (based on: no ad SDK in `package.json`, no ad code in `src/`)
Target age groups: the user decides; nothing in the app is aimed at children (based on: a general habit tracker with email sign-up)
Designed primarily for children under 13: No.

## You must confirm

- [ ] Children are not an intended audience (if they are, read the Families section of https://play.google/developer-content-policy/ first).
- [ ] Nothing new is planned for this release beyond what is in the code.
- [ ] Read every question in App Store Connect and Play Console as shown, and check it against the facts above.

## Review risks found (not age-rating answers)

- None found.
