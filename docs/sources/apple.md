# Apple App Store: verified facts

Checked 2026-11-07 against developer.apple.com unless noted. Items marked **unconfirmed** were not found on an official page and must not be stated as fact in skills.

## App Review Guidelines

Source: https://developer.apple.com/app-store/review/guidelines/ (page shows "Last Updated: October 16, 2026").

Sections: 1 Safety (1.1–1.7), 2 Performance (2.1–2.5.19), 3 Business (3.1–3.2), 4 Design (4.1–4.10), 5 Legal (5.1–5.6).

Recent changes (Apple News):
- 2026-10-16 (https://developer.apple.com/news/?id=92th7e5i): 1.2 covers nonconsensual intimate imagery including AI-generated; new 2.3.14 Creative Assets (relevant to app/brand, all audiences, no pricing or unverifiable claims); new 2.5.19 no hidden, dormant or undocumented features (moved from 2.3.1), obfuscating to hide features can end the account; 3.1.1(a) music streaming entitlement folded into StoreKit External Purchase Link entitlements.
- 2026-06-08 (https://developer.apple.com/news/?id=a233fmpw): 4.3(a)/(b) new examples; 4.3(b) names drinking games, Kama Sutra, fart and burp apps as low value; 4.5.3 no spam or phishing via Live Activities.
- 2026-02-06 (https://developer.apple.com/news/?id=d75yllv4): random or anonymous chat apps fall under 1.2.
- 2025-11-13 (https://developer.apple.com/news/?id=ey6d8onl): 1.2.1(a) and 4.7.5 age-restrict content above the app's rating; 4.1(c) no use of another developer's icon, brand or name; 4.7 covers HTML5/JS mini apps; 5.1.1(ix) adds crypto exchanges to regulated fields; 5.1.2(i) disclose sharing with third-party AI and get explicit permission; 3.2.2(ix) loan apps capped at 36% APR.
- 2025-05-01 (https://developer.apple.com/news/?id=9txfddzf): US storefront allows external purchase links, buttons and calls to action without an entitlement.

## Rejection data

- https://developer.apple.com/distribute/app-review/: over 40% of unresolved issues are guideline 2.1. 50% of submissions reviewed in under 24h, 90% in under 48h.
- 2025 Transparency Report (https://www.apple.com/legal/app-store/transparency/2025/): 9,100,620 submissions reviewed, 2,093,244 rejected, 387,087 approved after resubmission. Rejections by section: Performance 1,354,418; Legal 495,673; Design 415,532; Business 283,820; Safety 151,159. No per-guideline breakdown is published.

## Common rejections and fixes

| Guideline | Trigger | Fix | Source |
|---|---|---|---|
| 2.1 App completeness | Crashes, placeholder content, broken links, missing or expired demo login, backend down, IAP not reviewable | Working demo account for every role in Review Notes (include 2FA path); if the app offers auto-renewable subscriptions also give an account with an expired subscription; demo mode only with Apple's prior approval; hardware-dependent apps attach a real-device video; explain unreviewable IAP in notes (2.1(b)) | https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review |
| 2.3 / 2.3.1(a) Accurate metadata | Misleading or generic metadata or notes | Describe new features specifically in Review Notes | guidelines |
| 2.3.3 Screenshots | Splash, login or title-art-only screenshots, outdated UI, overlays hiding UI | More than half of the screenshots for each device size must show the app in use | https://developer.apple.com/help/app-review/guideline-reference/2-3-3-screenshots |
| 2.3.7 | Keyword stuffing, trademarks or prices in the name | Clean name and subtitle | guidelines |
| 2.3.10 | Other platforms' names or imagery | Remove them | guidelines |
| 2.5.1 / 2.5.2 / 2.5.4 / 2.5.14 / 2.5.19 | Private APIs; downloaded code that changes features; background modes used for other purposes; recording without visible consent; hidden features | Remove; for 2.5.19, remove the feature or make it available and describe it (disclosing a dormant feature does not make it allowed) | guidelines |
| 4.2, 4.2.2, 4.2.3 Minimum functionality | Web clippings, link collections, marketing-only apps, app needs another app to work | Add native, app-like value | guidelines |
| 4.2.6 | Built from a commercial template or app-generation service | Must be submitted by the content provider | guidelines |
| 4.3(a)/(b) Spam | Many bundle IDs for the same app; saturated categories | Merge into one app with IAP variants; differentiate | guidelines |
| 4.1(a–c) Copycats | Copying another app or brand | Original name, icon, UI | https://developer.apple.com/help/app-review/guideline-reference/4-1-prevent-copycat-rejection |
| 4.8 Login services | Third-party or social login as the primary account without an equivalent option | Also offer a login that limits data to name and email, allows hiding the email, and does no ad tracking without consent (Sign in with Apple qualifies). Exceptions: company-only accounts, education/enterprise, government ID, clients for a specific third-party service | guidelines |
| 3.1.1 In-app purchase | Unlocking digital content via license keys, QR codes, crypto | Use IAP and include restore; US storefront external links allowed per 3.1.1(a) | guidelines |
| 5.1.1(i) | Missing privacy policy | Link it in App Store Connect metadata and inside the app | guidelines |
| 5.1.1(ii) | Vague permission purpose strings | Say what the data is used for, with an example | https://developer.apple.com/help/app-review/guideline-reference/5-1-1-purpose-strings |
| 5.1.1(v) | Account creation without in-app deletion | See Account deletion | https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion |
| 5.1.1(ix) | Regulated field (banking and financial services, healthcare, gambling, legal cannabis, air travel, crypto exchanges) or sensitive user information, from an individual | Apple: "should be submitted by a legal entity that provides the services, and not by an individual developer" (a recommendation, not stated as an absolute bar) | guidelines |
| 5.1.2(i) | Sharing data (including with AI providers) without consent; forcing push, location or tracking permission to use the app | Disclose and get explicit permission; app must work without optional permissions | guidelines |
| 1.2 User-generated content | No moderation tools | Content filter, report mechanism, user blocking, published contact info | guidelines |
| 1.5 Developer information | Inaccurate contact info | Accurate contact info in app and a working Support URL | guidelines |

## Replying to App Review

Source: https://developer.apple.com/help/app-review/after-submitting-for-review/contact-app-review

- Reply in App Store Connect ("Reply to App Review"). Apple's help pages no longer use the name "Resolution Center".
- Be specific: name the feature, guideline, and the steps to see it. If the reviewer misunderstood, explain the concept.
- Do not use the reply to appeal (use the App Review Board) or to request expedited review.
- You can request a call; include your time zone; calls take 3–5 business days.
- Apple publishes no reply templates.

## Submission requirements

- Build SDK (https://developer.apple.com/news/upcoming-requirements/): since 2026-04-28 uploads must be built with Xcode 26+ and the 26 SDKs. Since 2026-09-09 apps must target iOS 13 or later. From April 2027 the iOS 27 SDK (Xcode 27) is required (https://developer.apple.com/news/?id=k1mtkt1k).
- Screenshots (https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications, re-checked 2026-11-07). Apple names display classes, not inches, for iPhone. Portrait sizes; landscape is the same pair swapped.
  - **Required:** at least one screenshot for "iPhone with Dynamic Island (medium display)": 1179×2556 or 1206×2622 (iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15, 14 Pro).
  - **Required if the app runs on iPad:** "iPad 13-inch display": 2064×2752 or 2048×2732.
  - Also accepted (optional): iPhone with Dynamic Island (large display) 1260×2736, 1290×2796, 1320×2868; iPhone with Face ID (large display) 1284×2778, 1242×2688; iPhone with Face ID (medium display) 1170×2532, 1125×2436, 1080×2340; iPhone with Home Button (large display) 1242×2208; iPhone with Home Button (medium display) 750×1334; iPad 11" 1488×2266, 1512×2316, 1668×2420, 1668×2388, 1640×2360; iPad 12.9" 2048×2732; iPad 10.5" 1668×2224.
  - iPhone Duo: outer 1398×2034, inner 2007×2853; required from April 2027 for apps using the iOS 27.1 SDK or later (the news post https://developer.apple.com/news/?id=kkphp5qo says "all submissions"; the pages differ).
  - 1–10 screenshots per device size, .jpeg, .jpg or .png. "Images can't include alpha channels or transparencies."
- App icon (Human Interface Guidelines, App icons, https://developer.apple.com/design/human-interface-guidelines/app-icons): 1024×1024, square, unmasked (system applies the mask). Layered Icon Composer file preferred, flat PNG allowed. Appearances: default, dark, clear, tinted. Avoid text, photos, Apple hardware, self-added gloss or shadows. "No transparency" is **unconfirmed** on the HIG page.
- App Privacy details (https://developer.apple.com/app-store/app-privacy-details/): required for new apps and updates; must include data collected by third-party SDKs; can be updated without a new build.
- Privacy manifest (PrivacyInfo.xcprivacy; Apple's reference: https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api): required-reason API declarations enforced at upload since 2024-05-01; each executable and listed SDK needs its own manifest; 86 listed SDKs at https://developer.apple.com/support/third-party-SDK-requirements/ need a manifest and a signature when shipped as binaries. Categories and reason codes: FileTimestamp DDA9.1, C617.1, 3B52.1, 0A2A.1; SystemBootTime 35F9.1, 8FFB.1, 3D61.1; DiskSpace 85F4.1, E174.1, 7D9E.1, B728.1; ActiveKeyboards 3EC4.1, 54BD.1; UserDefaults CA92.1, 1C8F.1, C56D.1, AC6B.1. The error code ITMS-91053 is **unconfirmed**.
- Account deletion (https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion): users must be able to start deletion inside the app; deactivation alone is not enough; applies to all account types; if deletion completes on the web, link directly to that page; no phone or email-only flows unless in a 5.1.1(ix) regulated field; apps using Sign in with Apple must revoke tokens via the REST API; tell subscribers that Apple billing continues until they cancel.
- Age ratings: tiers 4+, 9+, 13+, 16+, 18+; new questionnaire answers were due 2026-01-31 (https://developer.apple.com/news/?id=ks775ehf); social-media capability questions required from Sep 2026 (https://developer.apple.com/news/?id=tlur8uvi); new descriptors Shared Location and Dating & Relationships (dating forces 18+) required on submissions from 2026-11-16 and for all apps by 2027-01-12 (https://developer.apple.com/news/?id=yxkh08us).
- EU Digital Services Act trader status: must be declared even if not distributing in the EU; apps without it removed from the EU since 2025-02-17; traders must provide verified address, phone and email (https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements).
- Regulated medical device declaration (https://developer.apple.com/news/?id=nyqbfz1y, https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status): apps available in the EU/EEA, UK or US declare whether they are a regulated medical device if their primary or secondary category is Health & Fitness or Medical, or the age rating questionnaire says "Frequent" Medical or Treatment Information. Apps with no health or medical features declare No.
- Export compliance (https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance): asked on each submission; an Info.plist key skips the question (`ITSAppUsesNonExemptEncryption`, named in linked docs). France has separate rules.
- TestFlight (https://developer.apple.com/testflight/, https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview): up to 10,000 external testers; the first build added to a group goes to App Review, later builds may not need a full review; a build can be tested for up to 90 days. A limit of 6 review submissions per 24 hours is **unconfirmed** (not on either page).

## Metadata limits

Source: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information and platform-version-information.

| Field | Limit |
|---|---|
| Name | 2–30 characters |
| Subtitle | 30 characters |
| Keywords | 100 bytes, comma separated; no other app or company names |
| Promotional text | 170 characters, editable without a new version |
| Description | 4,000 characters, plain text |
| What's New | 4,000 characters |
| Review Notes | 4,000 bytes |
