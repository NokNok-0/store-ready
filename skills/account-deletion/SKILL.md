---
name: account-deletion
description: Adds account deletion that meets App Store guideline 5.1.1(v) and Google Play's account deletion policy - an in-app "Delete account" flow with confirmation, a backend endpoint that deletes the account and its data, sign-out and local data wipe, Sign in with Apple token revocation, the subscription billing notice, and the public web page Google Play requires for deletion requests. Detects the project's auth (Firebase Auth, Supabase, Clerk, Auth0 or custom) and adapts. Use when the user says delete account, account deletion, "let users delete their account", remove my data, data deletion request, delete account URL, 5.1.1(v), revoke Sign in with Apple tokens, or got a rejection or Play Console warning about account deletion. Produces code changes and the deletion URL for the Play Data safety form.
license: MIT
---

# account-deletion

Use this skill when the app lets users create an account (email, phone, social login, Sign in with Apple, or anything else) and there is no complete deletion path, or when App Review or Play Console flagged one.

If the app has no accounts at all, it does not need this. Say so and stop.

It produces:

- An in-app deletion flow: entry in settings, explanation, confirmation, server call, sign-out, local wipe.
- A backend endpoint (or function) that deletes the account and its data, and revokes Sign in with Apple tokens where used.
- A public web page for deletion requests (required by Google Play), or the plan and copy for it if it lives outside this repository.
- The delete account URL, written into `store/data-safety.android.md` when that file exists, and the in-app path for the review notes.

Store rules and their sources are in [references/store-rules.md](references/store-rules.md). Do not add rules from memory.

## The rules in short

Apple (https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion):

- Users can start deletion inside the app. Deactivation is not deletion. Applies to every account type.
- If deletion finishes on the web, the in-app entry links directly to that page.
- No phone or email-only flows unless the app is in a 5.1.1(ix) regulated field.
- Apps with Sign in with Apple revoke the user's tokens via Apple's REST API.
- Users with an App Store subscription are told billing continues until they cancel.

Google Play (https://support.google.com/googleplay/android-developer/answer/13327111):

- An in-app deletion path.
- A web link to request deletion without reinstalling the app.
- The account's associated data is deleted; anything retained is disclosed.
- Declared in the Data safety form.

## 1. Find what exists

1. Detect the auth provider and whether Sign in with Apple is used. Signals for each are in [references/providers.md](references/providers.md). There may be more than one.
2. Find where user data lives: database tables or collections keyed by user, file storage paths, third-party services that receive a user ID (analytics, crash reporting, email, payments, support).
3. Find any existing deletion code: a "delete account" string, an endpoint, a provider delete call, a support email used as the deletion path. An email-only flow does not count on iOS (unless the app is in a regulated field).
4. Find the settings or account screen where the entry belongs, and the project's patterns for screens, alerts, API calls and auth state.
5. Check for subscriptions: StoreKit or a purchases SDK on iOS, Play Billing on Android.
6. Ask the user once, together, for what the code cannot tell you: where the backend runs if it is not in this repository; what data must be kept after deletion and for how long (payment records, legal holds); which domain the web page should live on.

## 2. Build the backend deletion

One server-side implementation, used by the app and by the web page.

- Verify the caller from their token. Never take the user ID from the request body.
- Revoke Sign in with Apple tokens if the user used it (procedure in [references/providers.md](references/providers.md); read Apple's REST API pages for the request itself).
- Delete the user's data everywhere you control, then in third-party services that offer a deletion API, then the auth user last.
- Keep only what must be kept, and write down what and why: the web page and the Data safety form both disclose it.
- Make it idempotent so a retry after a timeout succeeds.

Provider-specific delete calls (Firebase Admin `deleteUser`, Supabase `auth.admin.deleteUser`, Clerk `users.deleteUser`, Auth0 Management API) and their constraints are in [references/providers.md](references/providers.md). Only the calls listed there are confirmed; for anything else about a provider, read its current docs.

Privileged keys (service role, Admin SDK credentials, Management API tokens, the Apple signing key) stay on the server. If the project has no server, add a minimal function on the provider's platform or the project's existing hosting, and tell the user this is a new deployed component.

Endpoint shape and the full list of duties: [references/implementation.md](references/implementation.md).

## 3. Build the in-app flow

Follow the pattern in [references/implementation.md](references/implementation.md), in the project's own style:

- "Delete account" in the account or settings screen, easy to find.
- An explanation of what is deleted and what is kept, written from what the backend does.
- The Apple subscription notice when the user has an App Store subscription.
- One clear confirmation, then the server call.
- On a stale session, re-authenticate and retry. For Sign in with Apple users without a stored refresh token, re-authenticating with Apple also provides the `authorizationCode` for revocation.
- On success: sign out of the provider SDK, clear every local store the app writes to, reset in-memory state, go to the signed-out start screen.
- On failure: say so and leave the account signed in. Never show "deleted" before the server confirms.

If deletion completes on the web instead, the in-app entry opens the deletion page itself, not a home page.

## 4. Publish the web deletion page

Required for Google Play. Choose between sign-in-and-delete, an emailed confirmation link, or (last resort) a manual request form, write the page from what the backend really does, and host it on a stable HTTPS URL on the developer's domain. Read the Play help page for the content it must show. Options and checks: [references/web-deletion-page.md](references/web-deletion-page.md).

If the page lives outside this repository, write its copy into a file the user can hand over, and do not report the URL as done until it is live.

## 5. Record the outputs

- Delete account URL: if `store/data-safety.android.md` exists, set its "Delete account URL" line; otherwise tell the user it is pending for `play-data-safety`.
- If deletion keeps any data, add it to the retention notes in `store/data-safety.android.md` and to the iOS answers in `store/privacy.ios.md` if those exist.
- In-app path (for example "Settings > Account > Delete account"): give it to the user for `review-notes`, so the reviewer can find it. The demo account must survive or be replaceable: tell the user that a reviewer deleting the demo account needs a fresh one for the next review.

## Verify

- [ ] Starting from a signed-in test account, the in-app flow deletes the account: the auth user is gone in the provider's console or API, and the user's rows and files are gone in every store listed in step 1.
- [ ] Signing in again with the same credentials does not restore the old account or data.
- [ ] After deletion the app shows the signed-out start screen, and secure storage, AsyncStorage and local databases hold nothing from that user.
- [ ] A failed server call leaves the user signed in with an error, not a false success.
- [ ] If Sign in with Apple is used: the backend revokes the user's Apple tokens, or the provider's docs confirm it does so; you checked which.
- [ ] If the app sells App Store subscriptions: the billing notice shows for a subscribed user before confirmation.
- [ ] The web deletion page loads logged out in a private window, completes or records a verified request, and states what is kept and for how long.
- [ ] No privileged key appears in the app bundle or the repository (search app code and config for service role keys, Admin SDK credentials, Management API tokens, `.p8` contents).
- [ ] `npx store-ready check` no longer warns about sign-up without a deletion path.
- [ ] Tell the user it passes the checks we know about. Do not say it will be approved.
