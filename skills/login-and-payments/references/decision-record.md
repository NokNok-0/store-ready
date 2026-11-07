# Decision record in store/review-risks.md

`store/review-risks.md` is shared: `app-review-risk` writes `## Product risks`, `mock-review` writes `## Mock review` sections. This skill owns `## Login and payments`.

- Create `store/` and the file (with a `# Review risks` heading) if missing.
- If a `## Login and payments` section exists, replace only that section. Keep every other section unchanged.
- Otherwise append the section at the end.

Each finding gets a status. `store-ready` treats the work as done only when no finding against 4.8, 3.1.1 or account deletion is `open`.

## Format

```markdown
## Login and payments (2026-11-07)

Stores: iOS, Android
Login methods found: Google (expo-auth-session, src/auth/google.ts), email and password (Supabase Auth)
Paid features found: Pro subscription (react-native-purchases, src/paywall/Paywall.tsx)
Result: 1 open, 2 resolved

### L1. Google sign-in is the primary login with no equivalent option (resolved)

- Rule: Apple 4.8 Login services. A third-party or social login as the primary account needs an equivalent option that limits data to name and email, allows hiding the email, and does no ad tracking without consent; Sign in with Apple qualifies.
- Evidence: `app/(auth)/sign-in.tsx:22` shows only "Continue with Google" and "Email"; email sign-up is behind a secondary link.
- Exception considered: none applies (consumer app, not company-only, education, enterprise, government ID, or a client for a third-party service).
- Decision: Add Sign in with Apple on iOS, on the same screen as Google.
- Change: `expo-apple-authentication` added to `plugins`; `ios.usesAppleSignIn: true`; `src/auth/apple.ts`; button in `app/(auth)/sign-in.tsx`. Account linking by verified email in `supabase/functions/link-apple`.
- Status: resolved
- Sources: https://developer.apple.com/app-store/review/guidelines/

### L2. Pro subscription restore (resolved)

- Rule: Apple 3.1.1. Digital content uses in-app purchase and includes restore.
- Evidence: purchases go through `Purchases.purchasePackage` in `src/paywall/Paywall.tsx`. No restore control existed.
- Decision: Add "Restore purchases" to the paywall and to Settings.
- Change: `src/paywall/Paywall.tsx`, `app/settings/index.tsx`.
- Status: resolved
- Sources: https://developer.apple.com/app-store/review/guidelines/

### L3. Play billing rules not yet read for the subscription (open)

- Rule: Google Play Payments and Subscriptions policies (not in store-ready sources).
- Evidence: same subscription is sold on Android through `react-native-purchases`.
- Decision: pending. Read https://support.google.com/googleplay/android-developer/answer/9858738 and https://support.google.com/googleplay/android-developer/answer/9900533 and record what they require.
- Status: open
- Sources: https://play.google/developer-content-policy/

### Review notes to pass on

- Demo account: <working account>. Expired-subscription account: <needed; ask the user>.
- Where to find restore: Settings > Restore purchases.

### Checked, no risk found

- 3.1.1 unlock codes: no license key, QR code or crypto unlock paths in the code.
- External purchase links: none in the app.
```

Rules for writing it:

- Every Evidence line points to a file (and line where useful) that exists.
- Every Sources URL is one listed in [apple-rules.md](apple-rules.md) or [play-billing.md](play-billing.md).
- Every guideline number cited appears in [apple-rules.md](apple-rules.md).
- Status is `open` or `resolved`, and `resolved` only when the change is in the project. Never write that the app will be approved.
- The example findings show the level of detail expected. Replace them.
