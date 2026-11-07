# The web deletion page

Google Play requires a web link where users can request account deletion without reinstalling the app, and the link goes into the Data safety form. Source: https://support.google.com/googleplay/android-developer/answer/13327111

On iOS the same page matters only if deletion completes on the web; then the in-app entry must link directly to it. Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion

What our sources quote from the Play help page: the link "must be functional (for example, loads without error)"; the request path must be "prominently featured and easily discoverable"; users must be able to request deletion "without sending the user back to the app"; the page names the app or developer as shown on the store listing; it outlines extra steps such as cancelling a subscription. Read the help page for the rest before building it.

"accounts that are created and operated offline are not app accounts and do not fall within policy scope." For local-only accounts, see "No server" below.

## Choose the flow

Pick the strongest option the project can support:

1. **Sign in and delete.** The page lets the user sign in with the same provider as the app, shows the explanation, and calls the same deletion endpoint as the app. Best when the auth provider has a web SDK (Firebase, Supabase, Clerk and Auth0 all do) or the backend already serves web sessions.
2. **Verified request.** The user enters the account email; the backend emails a single-use, short-lived link; opening it confirms and runs the deletion. Use when web sign-in is not practical. Rate-limit the form and do not reveal whether an email has an account.
3. **Manual request.** A form that creates a ticket someone processes. Only if 1 and 2 are not possible, and only with a stated time frame. Tell the user this is the weakest option and costs ongoing work.

Never delete on an unverified request. The page is public; anyone can type someone else's email.

## What the page says

Write it from what the backend really does:

- The app's name as it appears on Google Play, and the developer name, exactly as on the store listing.
- The steps to request deletion on this page, and the steps to delete in the app.
- What is deleted.
- What is kept, why, and for how long. This must match the Data safety form.
- How long deletion takes.
- A contact for questions.

Plain language, no legal boilerplate in place of these facts. The privacy policy can link to this page; it does not replace it.

## Where to host it

Any stable public HTTPS URL on a domain the developer controls. The URL goes into Play Console and stays there across releases, so it must not move.

- **Existing website:** add a page, for example `https://example.com/delete-account`.
- **Expo Router app with web output:** a route such as `app/delete-account.tsx`, exported with the project's existing web build and deployed where the site already lives. Keep native-only imports out of that route.
- **No website:** a static page on any static host the developer already uses, calling the backend's deletion endpoints. Ask the user which host and domain to use rather than choosing one.

If the user has already chosen where the page lives (for example next to their privacy policy in a public repository or on a hosted docs site), use that and record their choice; do not override it. If they have not chosen, suggest a domain they control over a document-sharing link or a third-party form, which can change or disappear. Either way, a repository file link only works once the file is pushed to a public branch: open it before recording it.

## No server

When accounts are created and operated on the device only, there is no server-side data to delete and no request to process. If a page is published anyway (the user wants one, or the Console asks for a URL), it says, in plain words:

- The app's name and the developer name, as on the store listing.
- That accounts and their data are stored only on the user's device, and the developer has no copy.
- How to delete the account in the app, tap by tap (for example "Settings > Delete account").
- That there is nothing to request from the developer, because there is no copy on a server.
- A contact for questions.

Do not write that uninstalling the app removes everything unless you have checked the platform backup behaviour for this build (device and cloud backups can keep app data); our sources do not cover it.

## After it is live

- Open the URL logged out, in a private window, on a phone-width screen. It must load without the app installed. Record the HTTP status and the date; `npx @noknok-0/store-ready check --verify-urls` checks it too.
- Run the full flow with a test account and confirm the account and its data are gone.
- Put the URL in `store/data-safety.android.md` (Delete account URL) and tell the user to enter it in Play Console, App content, Data safety.
