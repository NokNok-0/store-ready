# Apple: what reviewers need

Copied from `docs/sources/apple.md` in the store-ready repo, checked 2026-11-07.

## Limit

| Field | Limit | Source |
|---|---|---|
| Review Notes | 4,000 bytes | https://developer.apple.com/help/app-store-connect/reference/app-information/app-information and https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information |

Bytes, not characters. Curly quotes, em dashes and arrows are 3 bytes each in UTF-8; a byte-order mark adds 3; Windows line endings add 1 per line. Write plain ASCII.

## Guideline 2.1 App completeness

Source: https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review

Triggers: crashes, placeholder content, broken links, a missing or expired demo login, a backend that is down, in-app purchases that cannot be reviewed.

What Apple asks for:

- A working demo account for every role, given in Review Notes, including the path through two-factor authentication.
- For subscription apps, also an account with an expired subscription.
- A demo mode only with Apple's prior approval. Do not replace a demo account with a demo mode on your own.
- For apps that depend on hardware, a video of the app running on a real device.
- An explanation in the notes of any in-app purchase that cannot be reviewed (2.1(b)).

Over 40% of unresolved issues are guideline 2.1 (https://developer.apple.com/distribute/app-review/). Several of the triggers above (a missing or expired demo login, purchases that cannot be reviewed) are exactly what these notes prevent.

## Guideline 2.3 / 2.3.1(a) Accurate metadata

Source: https://developer.apple.com/app-store/review/guidelines/

Misleading or generic metadata or notes are rejected. Describe new features specifically in Review Notes.

## Guideline 2.5.19 No hidden features

Source: https://developer.apple.com/news/?id=92th7e5i (added 2026-10-16)

No hidden, dormant or undocumented features. Obfuscating code to hide features can end the developer account. Every feature that is not obvious from the first screen, including ones behind a server flag, a gesture or a setting, belongs in the notes with the steps to reach it.

## 5.1.1(v) Account deletion

Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion

Users must be able to start account deletion inside the app. Reviewers look for it; give the path in the notes. If deletion completes on the web, the app links directly to that page.

## Contacting App Review after submission

Source: https://developer.apple.com/help/app-review/after-submitting-for-review/contact-app-review

Replies go through "Reply to App Review" in App Store Connect. You can request a call; include your time zone. That is a later step, but putting a contact and time zone in the notes saves a round trip.

## Where the notes go

App Store Connect, the version's App Review Information section. Our sources do not describe that section's other fields (sign-in fields, attachments, contact fields); read them in App Store Connect. If it has separate sign-in fields, put the primary demo account there as well as in the notes. If it has an attachment field, attach the real-device video there; otherwise link the video in the notes.
