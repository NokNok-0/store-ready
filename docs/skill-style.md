# How store-ready skills are written

Every skill in `skills/` follows these rules. Reviewers reject skills that break them.

## Format

- Directory `skills/<name>/` with `SKILL.md`, optional `references/*.md`, optional `assets/`, optional `scripts/`.
- Frontmatter, nothing else:
  ```yaml
  ---
  name: <same as directory>
  description: <what it does and when to use it, with the words a user would actually type; 1024 characters max>
  license: MIT
  ---
  ```
- `name`: lowercase letters, digits and single hyphens, 64 characters max.
- Body under 300 lines. Long tables, full field lists and per-guideline details go in `references/`, linked from the body with a relative path one level deep (`references/guidelines.md`).
- No tool-specific syntax in SKILL.md (no Claude-only slash commands or tool names). Say "run", "read", "edit". When a script is needed, it lives in `scripts/` and runs with plain Node 20+ and no install step.

## Content

- Facts about Apple, Google or Expo come only from `docs/sources/*.md`, copied into the skill's own `references/` with the source URL next to each fact. If a fact is not there, the skill tells the agent to open the official page and read it, and gives the URL. Never state a store rule from memory.
- Write to the agent, in the imperative. Short sentences. Explain the reason behind a rule in one clause when it changes what the agent does.
- Start with when to use the skill and what it produces. End with a "Verify" section: concrete checks the agent runs before saying it is done (re-run `npx store-ready check`, count bytes, open the file).
- Every skill produces a change to the project or a file the user pastes into a console. No essays, no plans for their own sake.
- Ask the user only for what cannot be found in the project (legal entity name, whether they sell in the EU, a demo account password). Ask once, all together.
- Never promise approval. Say "passes the checks we know about".
- Generated store text: plain, specific, no superlatives ("best", "ultimate", "revolutionary"), no emoji unless the user asks, no claims that cannot be verified, within each field's limit.
- Code written by a skill matches the project's style and has no explanatory comments unless the project already writes them.

## Output files

Skills that produce submission artifacts write them under `store/` in the user's project:

| File | Written by |
|---|---|
| `store/listing.ios.json`, `store/listing.android.json` | store-listing |
| `store/review-notes.txt`, `store/app-access.android.txt` | review-notes |
| `store/privacy.ios.md` | ios-privacy |
| `store/data-safety.android.md` | play-data-safety |
| `store/age-rating.md` | age-rating |
| `store/screenshots/plan.md`; images in `store/screenshots/ios/iphone/`, `ios/ipad/`, `android/phone/`, `android/tablet/`, `android/feature-graphic/`, `android/icon/` | store-screenshots |
| `store/checklist.md` | submission-checklist |
| `store/review-risks.md` | app-review-risk, mock-review |

Listing file shapes (the checker validates them):

`store/listing.ios.json`
```json
{ "name": "", "subtitle": "", "keywords": "", "promotionalText": "", "description": "", "whatsNew": "" }
```

`store/listing.android.json`
```json
{ "title": "", "shortDescription": "", "fullDescription": "" }
```
