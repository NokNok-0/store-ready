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
- A public web page for deletion requests (required by Google Play for app accounts), or the plan and copy for it if it lives outside this repository.
- The delete account URL with the date you opened it and the HTTP status, written into `store/data-safety.android.md` when that file exists, and the in-app path for the review notes.

If the accounts exist only on the device (no server, no hosted auth provider), use "Local-only accounts" below instead of steps 2 and 4.

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
- The web link "must be functional (for example, loads without error)" and must name the app or developer as shown on the store listing.
- "accounts that are created and operated offline are not app accounts and do not fall within policy scope."

## 1. Find what exists

1. Detect the auth provider and whether Sign in with Apple is used. Signals for each are in [references/providers.md](references/providers.md). There may be more than one.
2. Find where user data lives: database tables or collections keyed by user, file storage paths, third-party services that receive a user ID (analytics, crash reporting, email, payments, support).
3. Find any existing deletion code: a "delete account" string, an endpoint, a provider delete call, a support email used as the deletion path. An email-only flow does not count on iOS (unless the app is in a regulated field).
4. Find the settings or account screen where the entry belongs, and the project's patterns for screens, alerts, API calls and auth state.
5. Check for subscriptions: StoreKit or a purchases SDK on iOS, Play Billing on Android.
6. Decide whether accounts are local-only: sign-up and sign-in write a profile to device storage (AsyncStorage, SecureStore, SQLite, files) and no auth provider SDK, backend URL or network call is involved, including for Sign in with Apple. If any account data reaches a server (sync, backup to your server, a token exchange), it is not local-only.
7. Ask the user once, together, for what the code cannot tell you: where the backend runs if it is not in this repository; what data must be kept after deletion and for how long (payment records, legal holds); which domain the web page should live on. If the user already chose a host (for example the repository that holds the privacy policy), use it and do not ask again.

## 2. Build the backend deletion

One server-side implementation, used by the app and by the web page.

- Verify the caller from their token. Never take the user ID from the request body.
- Revoke Sign in with Apple tokens if the user used it (procedure in [references/providers.md](references/providers.md); read Apple's REST API pages for the request itself).
- Delete the user's data everywhere you control, then in third-party services that offer a deletion API, then the auth user last.
- Keep only what must be kept, and write down what and why: the web page and the Data safety form both disclose it.
- Make it idempotent so a retry after a timeout succeeds.

Provider-specific delete calls (Firebase Admin `deleteUser`, Supabase `auth.admin.deleteUser`, Clerk `users.deleteUser`, Auth0 Management API) and their constraints are in [references/providers.md](references/providers.md). Only the calls listed there are confirmed; for anything else about a provider, read its current docs.

Privileged keys (service role, Admin SDK credentials, Management API tokens, the Apple signing key) stay on the server. If the project uses a hosted auth provider but has no server of its own, add a minimal function on the provider's platform or the project's existing hosting, and tell the user this is a new deployed component. If accounts are local-only, there is nothing to deploy: use "Local-only accounts" below.

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

Open the URL yourself, in a browser or with `node -e "fetch(process.argv[1]).then(r=>console.log(r.status,r.url),e=>console.log('failed',e.message))" <url>`, and record the status and date. A page that returns 404, needs a login, or is not pushed yet (a repository file link before the push) is not done: record it as blocking, tell the user to publish it, and open it again after. `npx store-ready check --verify-urls` does the same for the URLs the checker finds; without the flag it reports them as "found, not verified".

## Local-only accounts

Use this when step 1.6 found that accounts exist only on the device.

- **Apple still requires deletion.** 5.1.1(v) applies to all account types, so the in-app flow from step 3 is required. It deletes on the device: every record keyed to the user, files the app wrote for them (photos under the document directory), secure-store keys, then the profile; then it signs out to the start screen. Leave other local users' data alone. On failure, keep the user signed in and say so.
- **Sign in with Apple with no server.** Our source says apps using Sign in with Apple revoke tokens via the REST API. Revoke tokens if your server received them. If no identity token or authorization code ever left the device, there is nothing on a server to revoke: record that in your report with the file that shows it, and give the user Apple's pages to read (https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion, https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens). Do not add a server just to make revocation possible.
- **Google Play.** Quote the policy line to the user: "accounts that are created and operated offline are not app accounts and do not fall within policy scope." Ask them to confirm that no account data leaves the device; it is their declaration. Record the reasoning in `store/data-safety.android.md`. If they still want a deletion page, or the Console asks for a URL, the page must load and follow the "No server" section of [references/web-deletion-page.md](references/web-deletion-page.md).
- **Do not deploy a backend** for deletion alone.

## 5. Record the outputs

- Delete account URL: if `store/data-safety.android.md` exists, set its "Delete account URL" line with the check result, for example `https://example.org/delete-account (opened 2026-11-07: HTTP 200)` or `... (opened 2026-11-07: HTTP 404, not published; blocking)`; otherwise tell the user it is pending for `play-data-safety`. For local-only accounts with no page: `none: accounts are created and operated offline, out of policy scope (confirmed by the user on <date>)`.
- If deletion keeps any data, add it to the retention notes in `store/data-safety.android.md` and to the iOS answers in `store/privacy.ios.md` if those exist.
- In-app path (for example "Settings > Account > Delete account"): give it to the user for `review-notes`, so the reviewer can find it. The demo account must survive or be replaceable: tell the user that a reviewer deleting the demo account needs a fresh one for the next review.

## Verify

- [ ] Starting from a signed-in test account, the in-app flow deletes the account: the auth user is gone in the provider's console or API (local-only: the profile is gone from device storage), and the user's rows and files are gone in every store listed in step 1.
- [ ] Signing in again with the same credentials does not restore the old account or data.
- [ ] After deletion the app shows the signed-out start screen, and secure storage, AsyncStorage and local databases hold nothing from that user.
- [ ] A failed server call leaves the user signed in with an error, not a false success.
- [ ] If Sign in with Apple is used: the backend revokes the user's Apple tokens, or the provider's docs confirm it does so, or (local-only) your report says no token left the device, with the file that shows it.
- [ ] If the app sells App Store subscriptions: the billing notice shows for a subscribed user before confirmation.
- [ ] The web deletion page loads logged out in a private window, completes or records a verified request (local-only: explains in-app deletion), and states what is kept and for how long. The recorded URL carries the status and date you opened it; one that did not load is reported as blocking, not done.
- [ ] No privileged key appears in the app bundle or the repository (search app code and config for service role keys, Admin SDK credentials, Management API tokens, `.p8` contents).
- [ ] `npx store-ready check` no longer warns about sign-up without a deletion path (it looks for a visible deletion screen or button, not just a delete function).
- [ ] The confirmation and explanation text name only what this app deletes; no wording from the reference snippet is left over.
- [ ] Tell the user it passes the checks we know about. Do not say it will be approved.
