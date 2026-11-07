# Google Play: payments and subscriptions

Our sources (`docs/sources/google-play.md`, checked 2026-11-07) record only that the Developer Program Policy has a "Monetization and Ads" area. They do not record the payments rules themselves. Do not state Play billing rules from memory, and do not assume Apple's rules carry over.

Read these pages before making any Play payments decision. The first is the policy center; the others are the pages it links to for this area:

| Page | URL |
|---|---|
| Developer Program Policy | https://play.google/developer-content-policy/ |
| Monetization and Ads (section overview) | https://support.google.com/googleplay/android-developer/topic/9857752 |
| Payments | https://support.google.com/googleplay/android-developer/answer/9858738 |
| Subscriptions | https://support.google.com/googleplay/android-developer/answer/9900533 |

What to extract from them for the decision record, quoting the page:

- Which purchases inside the app must use Google Play's billing system, and which are exempt.
- Whether, and where, alternative billing or links to external payment are allowed, and under which programs or regions.
- What a subscription offer must show the user (price, period, trial terms, how to cancel).
- Anything about restoring or managing purchases.

Write each point into the decision record with the URL it came from and the date you read it. If a page does not load or does not answer a question, record the question as open; do not fill it in.

Before any of this, check whether the Android app takes payment in any form: in-app purchases, subscriptions, a link or web view to an external checkout, tips, donations. If it takes none, record "No payments on Android" in the decision record and skip these pages.
