# store-ready

Skills and a checker that take a mobile app from "it runs" to "ready for App Store and Google Play review".

## Start here

When the user wants to ship, submit, or fix a rejection, read `skills/store-ready/SKILL.md` and follow it. It runs the checker and routes to the other skills in order.

The checker runs without installing anything:

```bash
npx @noknok-0/store-ready check
```

## Skills

| Skill | Use it for |
|---|---|
| `skills/store-ready` | Entry point: status, checker run, next steps |
| `skills/app-review-risk` | Minimum functionality, spam, copycat and regulated-field risk |
| `skills/ios-privacy` | Purpose strings, privacy manifest, App Privacy answers |
| `skills/play-data-safety` | Data safety form, Android permission declarations, target API |
| `skills/account-deletion` | In-app account deletion for both stores |
| `skills/login-and-payments` | Sign in with Apple equivalence, in-app purchase rules |
| `skills/store-listing` | Name, subtitle, keywords, descriptions within limits |
| `skills/store-screenshots` | Screenshot sizes, order and checks |
| `skills/age-rating` | Apple age rating and Play IARC answers |
| `skills/review-notes` | Demo accounts and reviewer instructions |
| `skills/submission-checklist` | Accounts, signing, EAS build and submit, closed testing |
| `skills/rejection-fix` | Turn a rejection into a fix and a reply |
| `skills/mock-review` | Strict review before the real one |

## Roles

Tools without subagents can take on these roles in turn. Their full instructions are in `agents/`.

- **product-lead**: review risk before building much; one page at most.
- **app-engineer**: the code and config changes compliance needs.
- **app-reviewer**: read-only review in the stores' own format.
- **store-marketer**: listing text and screenshots.
- **release-manager**: accounts, credentials, builds, submission, replies.

## Ground rules

- Store rules come from each skill's `references/`, which cite official pages. If a rule is not there, open the official page; do not answer from memory.
- Never claim an app will be approved. Say it passes the checks we know about.
- Never upload to Apple or Google, or handle signing keys and passwords, without the user's explicit go-ahead.
