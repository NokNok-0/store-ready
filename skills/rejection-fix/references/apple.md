# Apple guidelines: cause, where to look, fix

From `docs/sources/apple.md` (checked 2026-11-07). "Guidelines" means https://developer.apple.com/app-store/review/guidelines/ (Last Updated: October 16, 2026). If the rejection cites a number not listed here, open the guidelines page, read that section in full, and work from its text.

"Build" says whether the fix needs a new binary. Code and app config changes always do, with a higher build number (https://docs.expo.dev/submit/introduction/). App Privacy details can be updated without a new build (https://developer.apple.com/app-store/app-privacy-details/). For other metadata-only fixes, App Store Connect shows whether the existing build can be resubmitted; our sources do not say.

---

### 2.1 App completeness

- Causes: crash; placeholder content; broken links; demo login missing, wrong or expired; backend down, or reachable only from your own network or VPN; IAP that cannot be reviewed.
- Look: `store/review-notes.txt`; auth guard and 2FA code; production API URL in app config and `eas.json` env; `lorem`, "coming soon", `localhost`, staging hosts; IAP product IDs in code.
- Fix: a working demo account for every role, on the production backend, with the 2FA path described; if the app offers auto-renewable subscriptions also an account with an expired subscription; demo mode only with Apple's prior approval; for hardware-dependent apps attach a real-device video; explain IAP that cannot be reviewed in the notes (2.1(b)). Review Notes limit 4,000 bytes. For a crash, ask the user for the crash log or screenshot attached to the rejection; you cannot reproduce it from files.
- Owner: `review-notes`; code fixes yourself.
- Build: not for notes or server fixes; yes for crashes and placeholder content.
- Source: https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review

### 2.3, 2.3.1(a) Accurate metadata

- Causes: description claims a feature the build lacks; generic or misleading text; new features not explained in notes.
- Look: `store/listing.ios.json` claims against screens in code.
- Fix: remove or correct each false claim; describe new features specifically in Review Notes.
- Owner: `store-listing`, `review-notes`. Build: no, unless the feature itself is the fix.
- Source: guidelines

### 2.3.3 Screenshots

- Causes: splash, login or title-art-only screenshots; outdated UI; overlays hiding the UI.
- Fix: more than half of the screenshots for each device size show the app in use; retake from the current build.
- Owner: `store-screenshots`. Build: no.
- Source: https://developer.apple.com/help/app-review/guideline-reference/2-3-3-screenshots

### 2.3.7, 2.3.10 Name, keywords, other platforms

- Causes: keyword stuffing, trademarks or prices in the name or subtitle (2.3.7); other platforms' names or imagery (2.3.10).
- Fix: clean name and subtitle; remove "Android", Google Play badges, other-platform UI from metadata and screenshots. Keywords: no other app or company names.
- Owner: `store-listing`, `store-screenshots`. Build: only if the other platform's name or imagery appears inside the app.
- Source: guidelines

### 2.3.14 Creative assets

- Causes (added 2026-10-16): assets not relevant to the app or brand, not suitable for all audiences, showing pricing or unverifiable claims.
- Fix: replace the asset named in the rejection. Read 2.3.14 on the guidelines page for which assets it covers.
- Owner: `store-screenshots`, `store-listing`. Build: only if the asset is the in-app icon.
- Source: https://developer.apple.com/news/?id=92th7e5i

### 2.5.1, 2.5.2, 2.5.4, 2.5.14, 2.5.19

- Causes: private APIs (2.5.1); downloaded code that changes features (2.5.2); background modes used for other purposes (2.5.4); recording without visible consent (2.5.14); hidden, dormant or undocumented features (2.5.19, added 2026-10-16; obfuscating to hide features can end the developer account).
- Look: if the rejection names an API or symbol, search the code and dependencies for it; OTA update setup; `UIBackgroundModes` against what the code does in the background; recording code and its on-screen indicator; feature flags, remote config, region or date switches, hidden routes.
- Fix: for 2.5.19, either remove the gated feature from the build, or make it available to users and describe how to reach it in Review Notes. Describing a feature that stays switched off does not fix it.
- Build: yes, except a 2.5.19 disclosure where the feature is already in the build and only the notes were missing.
- Source: guidelines; https://developer.apple.com/news/?id=92th7e5i

### 3.1.1 In-app purchase

- Causes: digital content unlocked by license keys, QR codes, crypto or an external payment; no restore.
- Look: payment SDKs, code-entry and QR unlock screens, what the purchase unlocks, a restore purchases action.
- Fix: sell digital content with IAP and include restore. On the US storefront, external purchase links, buttons and calls to action are allowed without an entitlement (2025-05-01). For other storefronts, physical goods or services used outside the app, read section 3.1 on the guidelines page; our sources do not cover them.
- Owner: `login-and-payments`. Build: yes.
- Sources: guidelines; https://developer.apple.com/news/?id=9txfddzf

### 4.1(a–c) Copycats

- Causes: copying another app or brand; 4.1(c) another developer's icon, brand or name.
- Fix: original name, icon and UI; remove the other brand from metadata and assets.
- Build: yes if the icon or in-app branding changes.
- Source: https://developer.apple.com/help/app-review/guideline-reference/4-1-prevent-copycat-rejection

### 4.2, 4.2.2, 4.2.3 Minimum functionality

- Causes: web clipping, link collection, marketing-only app, needs another app to work.
- Fix: add native, app-like value. Use the change list from `app-review-risk` (rule A1). This is product work: tell the user plainly it is not a config fix.
- Build: yes.
- Source: guidelines

### 4.2.6 Templates and app-generation services

- Cause: app from a commercial template or app-generation service, not submitted by the content provider.
- Fix: the content provider submits under their own developer account.
- Build: a new upload under the other account.
- Source: guidelines

### 4.3(a), 4.3(b) Spam

- Causes: many bundle IDs for the same app (4.3(a)); saturated categories; 4.3(b) names drinking games, Kama Sutra, fart and burp apps as low value (2026-06-08).
- Look: brand switching in app config, `productFlavors`, multiple targets, `brands/` or `clients/` folders. Ask the user what else is on their account.
- Fix: merge into one app with variants as IAP; differentiate. For the 4.3(b) named examples, say plainly that the concept is the issue.
- Owner: `app-review-risk` for the differentiation. Build: yes.
- Sources: guidelines; https://developer.apple.com/news/?id=a233fmpw. Read the current 4.3 text for the 4.3(a) examples added in 2026; our sources do not list them.

### 4.5.3 Live Activities

- Cause: spam or phishing via Live Activities (2026-06-08). Read 4.5.3 on the guidelines page.
- Source: https://developer.apple.com/news/?id=a233fmpw

### 4.7 Mini apps

- Cause: HTML5 or JavaScript mini apps (4.7 covers them since 2025-11-13). Read 4.7 and 4.7.5 (age-restricting content above the app's rating) on the guidelines page.
- Source: https://developer.apple.com/news/?id=ey6d8onl

### 4.8 Login services

- Cause: third-party or social login as the primary account without an equivalent option.
- Fix: also offer a login that limits data to name and email, allows hiding the email, and does no ad tracking without consent. Sign in with Apple qualifies. Exceptions: company-only accounts, education or enterprise, government ID, clients for a specific third-party service. If an exception applies, the reply explains which one.
- Owner: `login-and-payments`. Build: yes, unless replying with an exception.
- Source: guidelines

### 5.1.1(i) Privacy policy

- Fix: link it in App Store Connect metadata and inside the app.
- Owner: `ios-privacy`. Build: yes if the in-app link is missing; no if only the metadata URL was.
- Source: guidelines

### 5.1.1(ii) Purpose strings

- Cause: vague permission purpose strings.
- Fix: say what the data is used for, with an example. Edit `ios.infoPlist`, the config plugin option, or `Info.plist`.
- Owner: `ios-privacy`. Build: yes.
- Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-purpose-strings

### 5.1.1(v) Account deletion

- Cause: account creation without in-app deletion.
- Fix: users can start deletion in the app; deactivation alone is not enough; if deletion completes on the web, link directly to that page; no phone or email-only flow unless in a 5.1.1(ix) regulated field; Sign in with Apple tokens revoked via the REST API; subscribers told Apple billing continues until they cancel.
- Owner: `account-deletion`. Build: yes.
- Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion

### 5.1.1(ix) Regulated fields

- Cause: banking, health, gambling, crypto (including exchanges), air travel or another regulated field, submitted by an individual.
- Fix: submit from an organization account of the legal entity that provides the service, as Apple asks ("should be submitted by a legal entity"). Read 5.1.1(ix) for the full list.
- Build: a new upload from the organization account, or removal of the regulated feature.
- Sources: guidelines; https://developer.apple.com/news/?id=ey6d8onl

### 5.1.2(i) Data use and sharing

- Causes: sharing data, including with AI providers, without disclosure and explicit permission; forcing push, location or tracking permission to use the app.
- Fix: disclose and ask before the first send; the app works without optional permissions.
- Owner: `ios-privacy`. Build: yes.
- Sources: guidelines; https://developer.apple.com/news/?id=ey6d8onl

### 1.2 User-generated content

- Causes: no content filter, report mechanism, user blocking or published contact info. Random or anonymous chat falls under 1.2 (2026-02-06). Nonconsensual intimate imagery, including AI-generated, is covered (2026-10-16).
- Fix: add all four. Content above the app's rating must be age-restricted (1.2.1(a)); send rating changes to `age-rating`.
- Build: yes.
- Sources: guidelines; https://developer.apple.com/news/?id=d75yllv4; https://developer.apple.com/news/?id=92th7e5i

### 1.5 Developer information

- Fix: accurate contact info in the app and a working Support URL.
- Build: only if the in-app contact info is wrong.
- Source: guidelines

### 3.2.2(ix) Loan apps

- Cause: loan APR above 36%. Read 3.2.2(ix).
- Source: https://developer.apple.com/news/?id=ey6d8onl

### Upload emails about privacy manifests

Not a review rejection: Apple emails missing required-reason API declarations after upload. Add the reasons to `expo.ios.privacyManifests.NSPrivacyAccessedAPITypes` or `PrivacyInfo.xcprivacy`, with valid reason codes. Owner: `ios-privacy`. Build: yes. Source: https://docs.expo.dev/guides/apple-privacy/
