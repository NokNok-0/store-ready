# Age rating: what the sources say

Copied from `docs/sources/` in the store-ready repo, checked 2026-11-07. The questionnaires' exact question wording is not in these sources. Read the questions in the console; do not reconstruct them from memory.

## Apple App Store

| Fact | Source |
|---|---|
| Age rating tiers are 4+, 9+, 13+, 16+ and 18+. | https://developer.apple.com/news/?id=ks775ehf |
| Answers to the new age-rating questionnaire were due 2026-01-31. | https://developer.apple.com/news/?id=ks775ehf |
| Social-media capability questions are required from September 2026. | https://developer.apple.com/news/?id=tlur8uvi |
| New descriptors **Shared Location** and **Dating & Relationships** are required on submissions from 2026-11-16, and for all apps by 2027-01-12. | https://developer.apple.com/news/?id=yxkh08us |
| The Dating & Relationships descriptor forces an 18+ rating. | https://developer.apple.com/news/?id=yxkh08us |
| 1.2.1(a) and 4.7.5: content above the app's age rating must be age-restricted (2025-11-13 update). | https://developer.apple.com/news/?id=ey6d8onl |
| 4.7 covers HTML5/JavaScript mini apps. | https://developer.apple.com/news/?id=ey6d8onl |
| Random or anonymous chat apps fall under 1.2 (2026-02-06 update). | https://developer.apple.com/news/?id=d75yllv4 |
| 1.2 covers nonconsensual intimate imagery, including AI-generated (2026-10-16 update). | https://developer.apple.com/news/?id=92th7e5i |
| 1.2 user-generated content needs moderation: a content filter, a way to report content, user blocking, and published contact info. | https://developer.apple.com/app-store/review/guidelines/ |
| 5.1.1(ix): apps in regulated fields (banking, health, gambling, crypto, air travel) must be submitted by the legal entity, not an individual. | https://developer.apple.com/app-store/review/guidelines/ |

The App Store Connect age-rating help page is not in our sources. Open App Store Connect, go to the app's age rating section, and read each question as it is shown.

## Google Play

| Fact | Source |
|---|---|
| Every app needs an IARC content rating, from the questionnaire in the App content section of Play Console. | https://support.google.com/googleplay/android-developer/answer/9898843 |
| Unrated apps can be removed. | https://support.google.com/googleplay/android-developer/answer/9859655 |
| Retake the questionnaire when the app's content changes. | https://support.google.com/googleplay/android-developer/answer/9859655 |
| The Developer Program Policy has Restricted Content areas for user-generated content, health, AI-generated content, financial services and real-money gambling, and a Families area. | https://play.google/developer-content-policy/ |

If the app is aimed at children, or children are part of its audience, read the Families section of the Developer Program Policy before answering anything. Our sources do not copy its requirements.

## What this means for the agent

- The tier is computed by each store from the answers. Write an expected tier, label it as an estimate, and never present it as the result.
- Apple's new descriptors are live for submissions from 2026-11-16. An app with location sharing or dating features needs the matching answer before its next submission after that date.
- A content change (adding chat, a feed, a web view, AI generation) means retaking both questionnaires, not only the Play one.
