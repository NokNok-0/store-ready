# Rules, signals and changes

Rules are copied from `docs/sources/` (checked 2026-11-07) with the source beside each. "Guidelines" means https://developer.apple.com/app-store/review/guidelines/ (Last Updated: October 16, 2026). Where our sources stop, the entry says which page to read. Read it before you flag; do not fill the gap from memory.

Signals are where to look in the project. A signal is evidence, not a verdict: write down what you found and let the rule decide the severity.

---

## A1. Apple 4.2, 4.2.2, 4.2.3: minimum functionality

**Rule.** Web clippings, link collections, marketing-only apps, and apps that need another app to work are rejected. The fix is native, app-like value. Source: guidelines.

**Signals**
- The root screen is a web view (`react-native-webview`, `WKWebView`, `android.webkit.WebView`) loading the product's own website, with few or no other screens.
- `capacitor.config.*`, `config.xml` (Cordova), or a `server.url` pointing at a live site.
- Screens that are mostly `Linking.openURL` / `openURL` / `Intent.ACTION_VIEW` calls: a link list.
- Content is static: text, PDFs, a menu, opening hours, a contact form, with no state the user creates.
- The app does nothing useful until another app is installed or signed in (4.2.3).

**Changes that address it.** Name the screens or features, based on what the project already has. Directions that fit the rule's "native, app-like value":
- Move the core flow out of the web view into native screens backed by the existing API.
- Give the user state of their own on the device: saved items, history, offline access to content they chose.
- Use device capabilities the website cannot (camera input, notifications the user opts into, widgets), only where they serve the core task.
- For a companion app, make it useful on its own, or state in review notes exactly what the other app or device is and how the reviewer gets it. Hardware-dependent apps attach a real-device video (2.1 source: https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review).

Do not tell the user any particular feature guarantees approval.

**Severity.** High when the app is a site in a web view with nothing else. Medium when native screens exist but the main value is still web content or links.

## A2. Apple 4.2.6: commercial templates and app-generation services

**Rule.** An app built from a commercial template or an app-generation service must be submitted by the provider of the content. Source: guidelines. Read the 4.2.6 text on the guidelines page for the exact wording before flagging.

**Signals**
- A purchased template or white-label kit: its name or licence in `README`, `package.json` `name`/`author`, or a `LICENSE` from a template vendor.
- A brands, clients or tenants folder with logos and colours for several businesses, or config that swaps branding per build.
- The developer account that will submit belongs to an agency or freelancer, while the content (restaurant, gym, church, shop) belongs to a client. Ask the user who owns the content and whose account submits.

Our sources do not say whether code written with an AI coding assistant counts as an app-generation service. Do not flag that on its own. The rule as recorded is about who submits relative to who provides the content.

**Change.** The content owner enrols in the developer program and submits under their own account; the builder can be added to that account. If one business owns all the branded variants, see A3.

**Severity.** High when a template product is used and the submitting account is not the content owner. Medium when you cannot tell who owns the account: ask.

## A3. Apple 4.3(a): duplicate apps, many bundle IDs

**Rule.** Submitting many bundle IDs for the same app is spam. The fix is one app, with variants offered as in-app purchases where they differ. Source: guidelines. The 2026-06-08 update added new examples to 4.3(a) and 4.3(b) (https://developer.apple.com/news/?id=a233fmpw); our sources record only the 4.3(b) ones, so read the current 4.3(a) text for the rest before deciding.

**Signals**
- `app.config.js`/`.ts` that switches `bundleIdentifier`, `name` or icon on an environment variable or brand key.
- Android `productFlavors` with different `applicationId` values; several Xcode targets producing near-identical apps.
- One codebase per city, team, language, school or client, differing only in content or theme.
- Ask: does the user, or their company, already have apps in the store that do the same thing?

**Change.** Merge into one app where the user picks the city, team or content inside it. Paid variants become in-app purchases. Keep separate apps only where the function genuinely differs, and write down what differs.

**Severity.** High when two or more bundle IDs ship the same feature set. Medium when variants differ in some features and you cannot tell if it is enough.

## A4. Apple 4.3(b): saturated categories and low-value apps

**Rule.** 4.3(b) names drinking games, Kama Sutra, fart and burp apps as low value (added 2026-06-08). Saturated categories are treated as spam unless the app is clearly different. Sources: guidelines; https://developer.apple.com/news/?id=a233fmpw. Our sources do not list which other categories count as saturated: read the current 4.3 text.

**Signals**
- The app's purpose matches one of the named examples.
- The app's purpose matches a category the current 4.3 text calls saturated.
- The app offers what a store search shows dozens of others offering, with no stated difference. Ask the user what the app does that others do not.

**Change.** If the app is one of the named examples, say so plainly: changing the listing will not fix it; the concept itself is the problem. Otherwise, name the specific differentiator from the project (a feature, a data source, a niche audience) and make it the first screen and the first line of the listing. If there is none yet, say that and propose one based on what the code already does.

**Severity.** High for the named examples. Medium for a crowded category with a thin difference.

## A5. Apple 4.1(a–c): copycats

**Rule.** Copying another app or brand is rejected; use an original name, icon and UI. 4.1(c), added 2025-11-13: do not use another developer's icon, brand or name. Sources: https://developer.apple.com/help/app-review/guideline-reference/4-1-prevent-copycat-rejection; https://developer.apple.com/news/?id=ey6d8onl. Read the help page for what 4.1(a) and 4.1(b) each cover; our sources summarise them together.

**Signals**
- Another app's or company's name in the app name, `slug`, bundle ID, package name, keywords or `README` ("Instagram clone", "Uber for dogs" used as the product name).
- Icon or splash art that reuses another brand's logo, colours and shape.
- Screens that reproduce a well-known app's layout and wording closely.
- Keywords listing competitors (also a 2.3.7 metadata issue and against the keyword rules: no other app or company names; https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information).

Before writing "no risk" for the name, search the App Store and Google Play for the planned store name (or ask the user to, if you cannot open the stores). If an existing app uses the same or a confusingly similar name, record it as a Medium risk with what you found; 4.1(c) covers another developer's name. Trademark clearance is the user's to do.

Google Play has Impersonation and Intellectual Property policy areas (https://play.google/developer-content-policy/). Our sources do not detail them; read those sections before flagging Play-specific wording.

**Change.** New name and icon with no reference to the other brand; remove brand names from bundle ID, package, keywords and copy. Do it before the first upload, while changing the bundle ID or package costs nothing. Rework any screen that is a pixel copy.

**Severity.** High when another brand's name or icon is used. Medium for close UI imitation.

## A6. Apple 5.1.1(ix): regulated fields from an individual

**Rule.** Apps in regulated fields (our sources list banking, health, gambling, crypto, air travel; crypto exchanges were added 2025-11-13) must be submitted by the legal entity, not an individual. Sources: guidelines; https://developer.apple.com/news/?id=ey6d8onl. Read 5.1.1(ix) for the full list and wording; ours may be incomplete.

Related, from the same sources:
- 3.2.2(ix): loan apps capped at 36% APR (https://developer.apple.com/news/?id=ey6d8onl).
- Health and medical apps need a regulated medical device declaration in the EU, UK and US (https://developer.apple.com/news/?id=nyqbfz1y).
- Google Play lists Health, Financial Services and Real-Money Gambling under Restricted Content (https://play.google/developer-content-policy/). Read the relevant section; our sources do not detail them.
- A Play organization account needs a D-U-N-S number, which can take 30+ days (https://support.google.com/googleplay/android-developer/answer/13628312). This is a timeline risk on its own.

**Signals**
- Dependencies or code for bank linking, payments between users, trading, wallets or exchange APIs, betting or odds, medical records, prescriptions, diagnosis, flight booking.
- HealthKit or Health Connect use that goes beyond fitness logging. A step counter is not automatically a regulated health app: read 5.1.1(ix) and say Medium if unsure.
- Ask: is the Apple developer account an individual or an organization? Same for Play.

**Change.** Enrol or move the app to an organization account for the legal entity that provides the service, and start D-U-N-S now if needed. If the user has no legal entity, say the regulated feature cannot ship under an individual account and offer the version without it.

**Severity.** High for a clearly regulated feature on an individual account. Medium when the field is borderline or the account type is unknown.

## A7. Apple 1.2: user-generated content

**Rule.** Apps with user-generated content need a content filter, a way to report content, a way to block users, and published contact information. Random or anonymous chat apps fall under 1.2 (2026-02-06). 1.2 covers nonconsensual intimate imagery, including AI-generated (2026-10-16). Content above the app's age rating must be age-restricted (1.2.1(a), 2025-11-13). Sources: guidelines; https://developer.apple.com/news/?id=d75yllv4; https://developer.apple.com/news/?id=92th7e5i; https://developer.apple.com/news/?id=ey6d8onl.

Google Play has User Generated Content and AI-Generated Content policies under Restricted Content (https://play.google/developer-content-policy/). Read them when the app has either; our sources do not detail their requirements.

**Signals**
- Posts, comments, reviews, profiles, image or video uploads that other users can see.
- Chat or messaging, especially with strangers, random matching, or anonymous identities.
- AI image or video generation from user prompts or uploaded photos of people.
- Search the code for report, block, flag, moderation, filter. Missing all four is the finding.

**Change.** List what to add and where: a report action on each content item and profile; block user on profiles and chat; server-side filtering of text and images before others see them; contact information in the app (settings or about screen). For AI image generation of people, block sexual content of real people at generation time. For random or anonymous chat, read 1.2 in full before deciding the app is viable. Send age implications to `age-rating`.

**Severity.** High when others can see user content and there is no report and block. High for random or anonymous chat. Medium when moderation exists but one of the four pieces is missing.

## A8. Google Play: minimum and broken functionality, spam

**Rule.** Static text or PDF-only apps, single-wallpaper apps and apps that do nothing are not allowed. Apps that crash, freeze, fail to install or fail to load are rejected. Repeated violations can lead to account suspension. Play Console pre-review checks flag some issues before submission. Sources: https://support.google.com/googleplay/android-developer/answer/9898783; https://support.google.com/googleplay/android-developer/answer/2477981; https://support.google.com/googleplay/android-developer/answer/14807773.

Spam sits in the "Spam, Functionality, and User Experience" area of https://play.google/developer-content-policy/. Our sources do not detail the spam rules: read that section before flagging Play spam, and cite it.

**Signals**
- Same as A1, plus: a single wallpaper or a single document as the whole app.
- Several near-identical apps from the same codebase (same signals as A3).
- Keyword stuffing in the Play title or description, which can lead to suspension (https://support.google.com/googleplay/android-developer/answer/9859152).

**Change.** As A1 and A3. Remind the user that pre-review checks in Play Console are worth reading before sending for review.

**Severity.** High for static or single-asset apps. For spam, take the severity from what the policy section says.

## A9. Template, placeholder and fake content

**Rule.** Apple 2.1: placeholder content and broken links are listed triggers for an incomplete app (https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review). Apple 2.3: metadata and notes must not be misleading, so a feature that only looks finished must not be claimed (guidelines). Apple 4.1(c), added 2025-11-13: do not use another developer's icon, brand or name (https://developer.apple.com/news/?id=ey6d8onl; https://developer.apple.com/help/app-review/guideline-reference/4-1-prevent-copycat-rejection). Google Play: apps that do nothing are not allowed, and apps that crash, freeze or fail to load are rejected (https://support.google.com/googleplay/android-developer/answer/9898783). Our sources do not say whether a framework's template icon counts as "another developer's icon" under 4.1(c); treat it as a risk and replace it, which costs little.

**Signals.** Look at the files themselves, not their names:
- **Template artwork.** Open every image that ships as the app's identity: `icon`, `ios.icon`, `android.adaptiveIcon` (foreground, background, monochrome), `splash` and splash plugin images, `web.favicon`. Expo's template icon set, React logos (`react-logo.png`, `partial-react-logo.png`) still referenced in screens, or a framework logo as the icon. The checker's `app.template-content` warning names known template icons; it does not catch everything, so view the images anyway.
- **Placeholder accounts and text.** `example.com` addresses, hard-coded users (`test@`, `demo@`, `John Doe`), `lorem ipsum`, "TODO" in UI strings, sample data shown to every new user as if it were theirs.
- **Disabled or stub purchases.** A "Subscribe", "Upgrade" or "Pro" button that is `disabled`, shows "not available yet" or "coming soon", or has no purchases SDK behind it; limits ("5 habits on the free plan") enforced with nothing to buy.
- **"Coming soon" features.** Tabs, rows or screens that only say a feature is on its way.
- **Social buttons that never call the provider.** A "Continue with Google / Facebook / Apple" handler that creates a session from hard-coded data, with no provider SDK in `package.json` and no network call. Check every login button's handler, not just the package list.
- **Template screens left in.** Starter tabs, "Welcome!" or "Explore" screens that describe the framework instead of the app.

**Change.** Name each item and what replaces it:
- Template artwork: original icon and splash art for this app; tell the user if you cannot make it.
- Placeholder accounts and text: remove them, or replace with real content; sample data must be clearly the user's to delete, or not shipped.
- Stub purchases: either make the purchase real (route to `login-and-payments` for IAP) or remove the button and every limit that depends on it. This changes the product: ask the user which, and record the answer.
- "Coming soon": remove the entry point until the feature ships.
- Fake social login: remove the button, or implement the provider for real through `login-and-payments`.

**Severity.** High when the item is on the icon, the first screens, the sign-in screen or the purchase path a reviewer meets. Medium when it is only on a screen a reviewer is unlikely to reach.

## Out of scope here, route on

Note these in "Checked" with the skill that owns them; do not analyse them here.

| Seen in the project | Rule | Skill |
|---|---|---|
| Sends user data or prompts to a third-party AI provider | 5.1.2(i): disclose and get explicit permission (https://developer.apple.com/news/?id=ey6d8onl) | ios-privacy, play-data-safety |
| Third-party or social login that calls a real provider | 4.8 | login-and-payments |
| Paid digital content, subscriptions, external payment links that work | 3.1.1 | login-and-payments |
| Account sign-up | 5.1.1(v), Play account deletion | account-deletion |
| Runs HTML5 or JavaScript mini apps or games inside the app | 4.7 covers these (https://developer.apple.com/news/?id=ey6d8onl); read 4.7 | mock-review |
| Features switched on remotely or not shown to the reviewer | 2.5.19 hidden features (https://developer.apple.com/news/?id=92th7e5i) | mock-review, review-notes |
