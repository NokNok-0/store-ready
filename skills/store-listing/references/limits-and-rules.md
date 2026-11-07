# Listing limits and rules

Copied from `docs/sources/` in the store-ready repo, checked 2026-11-07. If a store page disagrees with this file, the store page wins: open it, use it, and report the difference.

## Apple App Store Connect

Source for limits: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information and https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information

| JSON key | Field | Limit | Notes |
|---|---|---|---|
| `name` | Name | 2–30 characters | |
| `subtitle` | Subtitle | 30 characters | |
| `keywords` | Keywords | 100 bytes | Comma separated. No other app names or company names. |
| `promotionalText` | Promotional text | 170 characters | Can be edited without submitting a new version. |
| `description` | Description | 4,000 characters | Plain text. |
| `whatsNew` | What's New | 4,000 characters | |

Keywords are limited in bytes, not characters. ASCII letters are 1 byte each in UTF-8; accented Latin letters are usually 2; CJK characters are 3; most emoji are 4. A 100-character keyword string in Japanese is about 300 bytes.

### App Review Guidelines that apply to listing text

Source: https://developer.apple.com/app-store/review/guidelines/ (Last Updated: October 16, 2026)

- **2.3 / 2.3.1(a) Accurate metadata.** Misleading or generic metadata is rejected. Describe what the app does, specifically.
- **2.3.7.** No keyword stuffing; no trademarks or prices in the name. Keep name and subtitle clean.
- **2.3.10.** No other platforms' names or imagery in the metadata.
- **2.3.14 Creative Assets** (added 2026-10-16, https://developer.apple.com/news/?id=92th7e5i). Assets must be relevant to the app or brand, suitable for all audiences, and contain no pricing and no unverifiable claims.
- **2.5.19** (added 2026-10-16). No hidden, dormant or undocumented features. Moved from 2.3.1.
- **4.1(c)** (2025-11-13, https://developer.apple.com/news/?id=ey6d8onl). No use of another developer's icon, brand or name.

Common rejections, from the same sources:

| Guideline | Trigger | Fix |
|---|---|---|
| 2.3 / 2.3.1(a) | Misleading or generic metadata or notes | Describe features specifically |
| 2.3.7 | Keyword stuffing, trademarks or prices in the name | Clean name and subtitle |
| 2.3.10 | Other platforms' names or imagery | Remove them |

## Google Play Console

Source: https://support.google.com/googleplay/android-developer/answer/9859152

| JSON key | Field | Limit |
|---|---|---|
| `title` | App name | 30 characters |
| `shortDescription` | Short description | 80 characters |
| `fullDescription` | Full description | 4,000 characters |

- Keyword stuffing can lead to suspension (same page).
- The Developer Program Policy has a Store Listing and Promotion area with a Metadata section, plus Impersonation and Intellectual Property areas: https://play.google/developer-content-policy/. Read the Metadata section before writing a Play listing for an app in a crowded category; this file does not copy its full text.

## Practices store-ready adds (not store rules)

These are not quoted from Apple or Google. They follow from the limits above and from the writing rules in `docs/skill-style.md`. Do not present them to the user as store rules.

- No space after commas in keywords: each space is a byte taken from the 100.
- No word already in the name in keywords: the name is already in the listing, so repeating it spends bytes on nothing new.
- No duplicates and no empty entries in keywords, for the same reason.
- No superlatives, no emoji, no prices anywhere in the text, plain sentences that lead with what the user can do.
