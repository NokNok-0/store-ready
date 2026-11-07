---
name: age-rating
description: Prepares answers for the App Store age rating questionnaire (tiers 4+, 9+, 13+, 16+, 18+, social-media capability questions, the new Shared Location and Dating & Relationships descriptors) and the Google Play content rating (IARC) questionnaire, from facts found in the app's code - user-generated content, chat, location sharing, web access, gambling and contests, mature themes, AI generation, ads and purchases. Use when the user asks about age rating, content rating, the IARC questionnaire, "what age rating should my app be", the App Store Connect age rating section, Play Console content rating, the 2026 age rating changes, or after adding chat, a feed, a web view or AI features. Produces store/age-rating.md with facts, suggested answers and what the user must confirm.
license: MIT
---

# age-rating

Use this skill before the first submission to either store, and again whenever the app's content changes: new chat, a feed, user uploads, a web view, AI generation, location sharing, ads, or new bundled content.

It produces `store/age-rating.md` in the user's project: the facts found in the code with evidence, a suggested answer for each topic on each store, an estimated tier, and a short list of what the user must confirm in the console.

What the sources say, with URLs, is in [references/sources.md](references/sources.md). Where to look in the code for each topic is in [references/fact-finding.md](references/fact-finding.md). Read both.

## What the agent can and cannot know

The exact question wording of both questionnaires is not in store-ready's sources, and the questions change: Apple changed its questionnaire for 2026 and is still adding descriptors. So:

- Gather facts from the code. That part is yours.
- Map facts to topics the questionnaires cover. Write suggested answers per topic.
- The user (or you, if the user pastes the questions) reads each question as shown in the console and answers from the facts. If the user pastes the question text, map each fact to the exact question and write the answer next to it.
- The store computes the rating. Your tier is an estimate. Say so.

## Dates that matter now

- Apple tiers: 4+, 9+, 13+, 16+, 18+.
- Apple's social-media capability questions are required from September 2026.
- Apple's **Shared Location** and **Dating & Relationships** descriptors are required on submissions from **2026-11-16** and for all apps by **2027-01-12**. Dating & Relationships forces 18+.
- Play: every app needs an IARC rating; unrated apps can be removed; retake the questionnaire when content changes.

If today is close to or after 2026-11-16 and the app shares location with other people or has dating features, the next submission needs these answers. Say this first in the output.

## 1. Gather the facts

Go through every topic in [references/fact-finding.md](references/fact-finding.md):

1. User-generated content
2. Chat and messaging (and whether it is random or anonymous)
3. Social features (follow, public profiles, feeds, likes, user search)
4. Location shared with other people (versus location used only by the app)
5. Dating and relationships
6. Unrestricted web access (web views or browsers with user-supplied URLs, mini apps)
7. Gambling, simulated gambling, paid random rewards, contests
8. Mature or sensitive themes in bundled content and seed data
9. AI-generated content
10. Advertising
11. Purchases
12. Age collection and audience (children)

For each, write one of: **found** (with file paths), **not found** (with where you looked), or **unclear** (with what would settle it). Read the code that uses each dependency; a dependency in `package.json` alone proves nothing.

While doing this, note any review risk that is not an age-rating answer and list it separately at the end of the file:

- UGC without a report button, user blocking, a content filter, or published contact info (Apple 1.2 requires all four).
- Random or anonymous chat (Apple 1.2).
- Real-money gambling, or a regulated field submitted from a personal account (Apple 5.1.1(ix)).
- Content above the rating the app will get that is not age-restricted (Apple 1.2.1(a), 4.7.5), for example a web view or mini apps that can show anything.
- AI generation without output filtering (Apple 1.2; Play AI-Generated Content policy).

## 2. Ask the user once

Ask only what the code cannot show, in one message:

- Is the app aimed at children, or are children part of its intended audience?
- Content that lives on the server rather than in the code: what kinds of posts, media or listings exist, and is any of it mature?
- For ads: how the ad network's content settings are configured, if the code does not set them.
- Anything planned for this release that is not in the code yet.

## 3. Write `store/age-rating.md`

Use this structure. Keep each answer to one line; the evidence column carries the detail.

```markdown
# Age rating answers

Prepared <YYYY-MM-DD> from the code at <commit or "working tree">. Estimates, not results: each store computes the rating from the answers.

## Act now
- <for example: "Shared Location descriptor applies (friends see each other on the map). Answer it before the next submission; required on submissions from 2026-11-16.">

## Facts found
| Topic | Finding | Evidence |
|---|---|---|
| User-generated content | found: users post photos visible to followers | app/post/new.tsx, lib/api/posts.ts |
| Chat | not found | searched package.json, app/, lib/ for chat SDKs and messages tables |
| ... | | |

## Apple App Store Connect (age rating)
Estimated tier: <4+ | 9+ | 13+ | 16+ | 18+> (estimate)
| Topic | Suggested answer | Based on |
|---|---|---|
| Social-media capabilities | <which capabilities apply, each checked against Apple's list as read on <date>> | Facts: Social features |
| Shared Location | <Yes / No> | Facts: Location |
| Dating & Relationships | <Yes / No> | Facts: Dating |
| Unrestricted web access | <Yes / No> | Facts: Web access |
| ... | | |

## Google Play (content rating, IARC)
| Topic | Suggested answer | Based on |
|---|---|---|
| ... | | |
Retake this questionnaire whenever the app's content changes.

## You must confirm
- [ ] <each "unclear" fact, and each answer that depends on server content or intent>
- [ ] Read every question in App Store Connect and Play Console as shown, and check it against the facts above.

## Review risks found (not age-rating answers)
- <or "None found">
```

If the user pasted the actual questions from either console, replace that store's topic table with a table of the exact questions and your suggested answer for each.

## 4. Tell the user where to answer

- Apple: App Store Connect, the app's age rating section. Answer every question, including the social-media capability questions and the new descriptors.
- Google Play: Play Console, App content, Content rating. Start or retake the questionnaire.

Do not tell the user the app "will be rated" a given tier. Say "the answers above point to <tier>; the store sets the rating".

## Verify

- [ ] Every one of the 12 topics has a finding (found, not found, or unclear) with evidence or the places searched.
- [ ] Every "found" fact cites at least one file path, and the code at that path was read, not just a dependency name.
- [ ] Shared Location and Dating & Relationships each have an explicit Yes/No suggestion, and the dates 2026-11-16 and 2027-01-12 appear if either applies.
- [ ] If dating applies, the estimated Apple tier is 18+.
- [ ] Every suggested answer points to a fact in the table.
- [ ] The file says the tier is an estimate and lists what the user must confirm.
- [ ] Review risks that are not age-rating answers are listed separately, not mixed into the answers.
