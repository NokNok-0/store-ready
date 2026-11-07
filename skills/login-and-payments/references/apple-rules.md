# Apple: login and payment rules

Copied from `docs/sources/apple.md` (checked 2026-11-07). Guidelines page: https://developer.apple.com/app-store/review/guidelines/ (shows "Last Updated: October 16, 2026"). If you need a rule that is not here, read the guideline on that page; do not fill the gap from memory.

## 4.8 Login services

| | |
|---|---|
| Rejected | Third-party or social login as the primary account, without an equivalent option |
| Fix | Also offer a login that limits data collection to name and email, lets the user hide their email, and does no ad tracking without consent. Sign in with Apple qualifies |
| Exceptions | Accounts only for the company's own services; education or enterprise apps; government ID; clients for a specific third-party service |
| Source | guidelines page, 4.8 |

Reading it for a project:

- The rule is triggered by a third-party or social login being the primary account (Google, Facebook, and similar). An app with only its own email and password accounts is not in 4.8's trigger as recorded in our sources.
- Our sources do not define "primary". Working reading for this skill: a social login that can create the user's account by itself makes it a primary account option, wherever the button sits on the screen. If that reading is doubtful for an app, read 4.8 on the guidelines page and record what it says.
- A login button that never calls its provider is not a login service at all; it is placeholder content (2.1), handled by `app-review-risk`.
- Adding another social login does not satisfy it unless that login meets all three properties above. Sign in with Apple is the option our sources name as qualifying.
- If an exception may apply, quote the exception and the evidence in the decision record. If it is not clearly one of the four, treat 4.8 as applying.

## 3.1.1 In-app purchase

| | |
|---|---|
| Rejected | Unlocking digital content through license keys, QR codes, crypto or similar instead of in-app purchase |
| Fix | Use in-app purchase, and include a way to restore purchases |
| US storefront | External purchase links allowed per 3.1.1(a) |
| Source | guidelines page, 3.1.1 |

- 2025-05-01: on the US storefront, apps may include external purchase links, buttons and calls to action without an entitlement. https://developer.apple.com/news/?id=9txfddzf
- 2026-10-16: the 3.1.1(a) music streaming entitlement was folded into the StoreKit External Purchase Link entitlements. https://developer.apple.com/news/?id=92th7e5i

Not in our sources, so read guideline 3.1 on the guidelines page before deciding:

- How physical goods and services used outside the app may be paid for.
- Rules for external purchase links on storefronts other than the US, and which entitlements apply there.
- Reader apps, multiplatform services, person-to-person services, tipping and other special cases in 3.1.

## 2.1 App completeness, for paid features

Source: https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review

- In-app purchases that cannot be reviewed are a 2.1 rejection. Explain them in Review Notes (2.1(b)).
- For auto-renewable subscriptions, give the reviewer an account with an expired subscription as well as the working demo account, so they can go through the whole purchase flow (https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review/).

## Account deletion and subscriptions

Users with an App Store subscription must be told, in the deletion flow, that Apple billing continues until they cancel. https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion

## Expo: Sign in with Apple

Verified on Expo docs 2026-11-07, not yet recorded in `docs/sources/expo.md`. https://docs.expo.dev/versions/latest/sdk/apple-authentication/

- Package and config plugin: `expo-apple-authentication`, added to `plugins`.
- Set `ios.usesAppleSignIn` to `true` in app config.
- The credential includes `user` (stable identifier), `identityToken` (JWT), `authorizationCode` (short-lived, for the server), and `email` and `fullName`, which may be null, for example when it is not the user's first sign-in.
- The library supports iOS and tvOS only, not Android or web.
