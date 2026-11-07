# Account deletion: store rules

Copied from `docs/sources/apple.md` and `docs/sources/google-play.md` (checked 2026-11-07). Each rule has its source. If you need a rule that is not here, open the page and read it.

## Apple (guideline 5.1.1(v))

Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion

| Rule | What it means for the build |
|---|---|
| Users must be able to start deletion inside the app | A visible entry in the app, not only on a website or by email |
| Deactivation alone is not enough | The account and its data are deleted, not disabled |
| Applies to all account types | Including accounts created through social login or Sign in with Apple |
| If deletion completes on the web, link directly to that page | The in-app entry opens the deletion page itself, not a home page or a general settings page |
| No phone or email-only flows, unless the app is in a 5.1.1(ix) regulated field | "Email us to delete your account" or "call support" is not a deletion flow for most apps |
| Apps using Sign in with Apple must revoke tokens via the REST API | The backend calls Apple's token revocation endpoint when the account is deleted |
| Tell subscribers that Apple billing continues until they cancel | Show this before the user confirms, if they have an App Store subscription |

The 5.1.1(ix) regulated fields named in our sources: banking, health, gambling, crypto, air travel. Source: https://developer.apple.com/app-store/review/guidelines/

Sign in with Apple REST API: https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api. Token revocation: https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens. Our sources do not record the endpoint, parameters or how to build the client secret; read those pages before writing the call.

## Google Play

Source: https://support.google.com/googleplay/android-developer/answer/13327111

| Rule | What it means for the build |
|---|---|
| Apps that let users create an account must offer an in-app deletion path | Same in-app entry as for iOS |
| A web link where users can request deletion without reinstalling the app | A public HTTPS page; the user must not need the app to use it |
| Deletion of the data associated with the account | Not only the login record |
| Disclose any data that is retained | Say what is kept, why, and for how long, on the web page and in the Data safety form |
| Declare it in the Data safety form | The web link goes into Play Console, App content, Data safety |

Quoted from the help page (re-checked 2026-11-07, `docs/sources/google-play.md`):

- "accounts that are created and operated offline are not app accounts and do not fall within policy scope."
- "Permanently private and enterprise device management apps are exempt from this policy requirement."
- The web link: "The weblink must be functional (for example, loads without error)".
- The deletion request path must be "prominently featured and easily discoverable".
- It must let users request deletion "without sending the user back to the app".
- It must name the app or developer as shown on the store listing.
- It must outline extra steps, such as cancelling a subscription.

Our sources quote only these lines. Read the help page for anything else before writing the page.

Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469

## Accounts that live only on the device

- Apple: 5.1.1(v) "applies to all account types", so a local account still needs in-app deletion. Our source says apps using Sign in with Apple revoke tokens via the REST API; it does not describe an app that never sends a token to a server. Revoke tokens if your server received them; if no token ever left the device, record that and point the user to the 5.1.1(v) page and https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens.
- Google Play: "accounts that are created and operated offline are not app accounts and do not fall within policy scope." Whether this app's accounts are offline is the user's declaration; confirm it with them.

## Both

- The in-app path, the web page and the backend do the same thing: one deletion implementation, two entry points.
- Assume the reviewer will try it. The demo account in the review notes must be one they can delete, or the notes must say how to get a fresh one. Pass the in-app path ("Settings > Account > Delete account") to `review-notes`.
