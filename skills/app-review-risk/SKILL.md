---
name: app-review-risk
description: 'Flags App Store and Google Play rejection risks in what the app is, before or early in building: minimum functionality (Apple 4.2, 4.2.2, 4.2.3), commercial template or app-generator apps (4.2.6), spam and duplicate apps (4.3(a), 4.3(b)), copycats (4.1), regulated fields such as banking, crypto, gambling or health from an individual account (5.1.1(ix)), user-generated content and chat moderation (1.2), and Google Play minimum functionality and spam policy. Use when the user asks "will Apple reject this idea", "is my app too simple for the App Store", "Guideline 4.2 minimum functionality", "Guideline 4.3 spam", "can I publish a web wrapper", "can I submit several versions of the same app", "do I need a company account", or is starting a new app. Writes store/review-risks.md with each risk, the evidence in the project and a concrete change.'
license: MIT
---

# app-review-risk

Use this before much is built, or as the first step of `store-ready` on an existing project. It looks at what the app is, not how it is configured: the risks here cannot be fixed with a purpose string or a form, and they get more expensive with every screen built.

Output: `store/review-risks.md` with a "Product risks" section. Each risk has the rule, the evidence found in the project, and a concrete change. Areas checked with no risk are listed too, so the user knows what was covered.

Rules, signals and severities are in [references/rules.md](references/rules.md). Read it before starting. It is the only source of store rules for this skill; where it says to read an official page, read that page before flagging.

## 1. Learn what the app is

From the project, in this order:

1. `README`, app name, `slug`, description fields in app config or `package.json`.
2. The navigation tree: Expo Router `app/` folder, React Navigation stacks, storyboards, SwiftUI root views, Android activities and nav graphs. Count the real screens and note what each does.
3. Dependencies (`package.json`, Podfile, Gradle): web view, auth, payments, chat, media upload, AI SDKs, health, finance, wallet libraries.
4. Build variants: `app.config.*` branching on env or brand, `productFlavors`, multiple Xcode targets, brand or client folders.
5. Assets: icon, splash, any image that carries another brand.
6. `store/listing.*.json` if it exists: what the app claims to be.

If there is no code yet, use the user's description of the app as the evidence and say so in the file.

Write down in one or two sentences what the app does for the user. Every risk below is judged against that sentence.

## 2. Ask once

Some risks depend on facts the project cannot show. Ask them together, only those that apply:

- Is the Apple developer account (and the Play account) an individual or an organization? Needed if anything looks like a regulated field (A6).
- Who owns the content and brand, and whose developer account will submit? Needed if it looks like a template or client app (A2).
- Do you or your company already have apps in the stores that do the same thing? Needed if build variants exist or the concept is generic (A3, A4).
- What does this app do that existing apps in its category do not? Needed for A4.

If the user does not answer, record the risk as Medium with "depends on: <question>".

## 3. Check each area

Go through A1 to A8 in [references/rules.md](references/rules.md). For each:

- Look for the signals listed. Note file paths and line numbers.
- Decide: risk found (High or Medium, using the severity notes for that area) or no risk.
- For a risk, write a change that names the actual screens, files or features in this project. "Add more functionality" is not a change. "Move order history and saved addresses out of the web view into native screens using `src/api/orders.ts`" is.
- For no risk, write one line saying what you checked and what cleared it.

Things to keep straight:

- One finding per cause. A web view app with a link list is one A1 risk, not two.
- If both stores are affected, say so in one risk with both rules.
- Do not flag something the rules file does not support. If you think there is a risk that is not covered, write it under "Not covered by our sources" with the official page to read, not as a finding.
- Items listed under "Out of scope here" in the rules file get one line in "Checked" pointing to the owning skill.

## 4. Write `store/review-risks.md`

Create `store/` if missing. If the file exists, replace only the `## Product risks` section and keep everything else, especially any `## Mock review` sections written by `mock-review`.

Format:

```markdown
# Review risks

## Product risks (2026-11-07)

App: <name>, <one-sentence description of what it does for the user>
Evidence base: project at <path> | user description (no code yet)
Stores: iOS, Android
Result: 1 High, 1 Medium

### R1. App is the website in a web view (High)

- Rule: Apple 4.2 Minimum Functionality; Google Play minimum functionality.
- Evidence: `app/index.tsx:8` renders `<WebView source={{ uri: "https://shop.example.com" }} />`. No other routes in `app/`. No native API calls.
- Why it matters: 4.2 names web clippings; Play does not allow apps that add nothing over static content.
- Change: Build product list, cart and order history as native screens on the existing REST API in `src/api/`. Keep the web view only for the payment page. Add saved items stored on the device so the app is useful when the site is not open.
- Sources: https://developer.apple.com/app-store/review/guidelines/ ; https://support.google.com/googleplay/android-developer/answer/9898783

### R2. ...

### Checked, no risk found

- 4.3(a) duplicates: one bundle ID (`com.example.shop`), no flavors or brand folders.
- 4.1 copycats: name, icon and keywords contain no other brand.
- 5.1.1(ix) regulated fields: no finance, health, gambling, crypto or travel features.
- 1.2 user content: no content is shared between users.
- 3.1.1 payments: card payments for physical goods; checked by login-and-payments.

### Not covered by our sources

- <only if needed: what, and the official page to read>
```

Rules for the file:

- Severity is High or Medium. Do not list Low risks; if it is not worth acting on, it goes in "Checked" with a note.
- Every risk has all five lines: Rule, Evidence, Why it matters, Change, Sources.
- Evidence is a path and line, a config value, or a quote from the user's description. Never "the app seems".
- Sources are URLs from the rules file.
- No promise that the change will get the app approved. The change removes the risk the rule describes.

## 5. Tell the user

In a few lines: the count by severity, the single most important change, and whether it should happen before more is built. If a risk is High and the concept is the problem (A4 named examples, A6 without a legal entity), say so directly and offer the version of the app that avoids it.

If the user wants a change made, that is product work, not this skill: make it with them or hand it to the app-engineer role, then re-run this skill.

## Verify

- `store/review-risks.md` exists and the `## Product risks` section has today's date.
- Any `## Mock review` sections that were in the file before are still there, unchanged.
- Every area A1 to A8 appears either as a risk or as a line under "Checked".
- Every Evidence path exists in the project and the line shows what the risk says.
- Every Sources URL appears in [references/rules.md](references/rules.md).
- No risk cites a guideline number that is not in the rules file.
- No sentence says the app will be approved or rejected; risks describe what the rule names.
