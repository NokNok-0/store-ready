---
name: login-and-payments
description: Decides and implements what App Store and Google Play require for login and payments - Apple guideline 4.8 (an equivalent login option when Google, Facebook or another social login is the primary account; Sign in with Apple with expo-apple-authentication), guideline 3.1.1 in-app purchase for digital content with restore purchases, the US storefront rule allowing external purchase links, and where to read Google Play's payments and subscriptions policy. Use when the user asks "do I need Sign in with Apple", "add Sign in with Apple", "Google login rejected", guideline 4.8, "can I use Stripe instead of in-app purchase", in-app purchase, IAP, subscriptions, restore purchases, guideline 3.1.1, external payment link, link to my website to buy, Play billing, or got a rejection about login or payments. Produces a decision record appended to store/review-risks.md and the code and config changes.
license: MIT
---

# login-and-payments

Use this skill when the app has any sign-in other than its own email and password, sells anything, links to a purchase page, or was rejected under 4.8 or 3.1.1. Run it before `ios-privacy` and `account-deletion`: adding Sign in with Apple or a purchases SDK changes what those skills record.

It produces:

- Code and config changes: Sign in with Apple, a restore purchases control, removal or gating of non-compliant payment paths.
- A `## Login and payments` section in `store/review-risks.md`: each finding with the rule, evidence, decision, change and status (format in [references/decision-record.md](references/decision-record.md)).

Apple rules and sources: [references/apple-rules.md](references/apple-rules.md). Play: [references/play-billing.md](references/play-billing.md). Our sources record little about Play billing; read the linked policy pages and do not state Play payment rules from memory.

## 1. Inventory

From `package.json`, app config, and the source:

- **Login methods.** Social and third-party: Google, Facebook, X, GitHub, Microsoft, or any OAuth provider (`expo-auth-session`, `@react-native-google-signin/google-signin`, `react-native-fbsdk-next`, provider SDK calls such as `signInWithOAuth`, `signInWithIdToken`, `OAuthProvider`). The app's own email/password, magic link, phone. Sign in with Apple (`expo-apple-authentication`, `@invertase/react-native-apple-authentication`). Note which one the sign-in screen leads with.
- **Paid features.** Purchases SDKs (`react-native-purchases`, `expo-iap`, `react-native-iap`), StoreKit or Play Billing in native code, payment SDKs (`@stripe/stripe-react-native` and others), web checkout links (`Linking.openURL` or web views to pricing, checkout, or billing pages), license key or promo code entry, QR unlocks, crypto payments.
- **What each paid item is.** Digital content or features used in the app, or physical goods and services used outside it.
- **Storefronts.** Where the app is distributed on the App Store (ask if unknown).

Ask the user once, together, only for what the code cannot show: storefronts; whether a business exception to 4.8 applies (company-only accounts, education or enterprise, government ID, a client for a specific third-party service); whether paid items are consumed in the app or outside it, if unclear.

## 2. Login: guideline 4.8

If a third-party or social login is the primary account, the app must also offer a login that limits data collection to name and email, lets the user hide their email, and does no ad tracking without consent. Sign in with Apple qualifies. Exceptions: company-only accounts, education or enterprise apps, government ID, clients for a specific third-party service.

Decide:

- Own email/password only: no 4.8 finding. Record it under "Checked, no risk found".
- Social login present and an exception clearly applies: record the exception and the evidence.
- Otherwise: add Sign in with Apple on iOS. That is the usual answer because it is the option our sources name as qualifying, and it fits any backend.

### Adding Sign in with Apple (Expo)

1. Install `expo-apple-authentication` with `npx expo install expo-apple-authentication`, add it to `plugins`, and set `ios.usesAppleSignIn: true`.
2. Make sure the App ID has the Sign in with Apple capability in the Apple Developer account, and enable Apple as a provider in the auth service (Firebase, Supabase, Clerk, Auth0, or the backend). Tell the user which console steps are theirs; read the provider's docs for its Apple setup.
3. Add the button where the other login buttons are.

```tsx
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';

type Props = {
  onCredential: (credential: AppleAuthentication.AppleAuthenticationCredential) => Promise<void>;
};

export function AppleSignInButton({ onCredential }: Props) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  if (!available) return null;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={8}
      style={{ height: 48 }}
      onPress={async () => {
        try {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          await onCredential(credential);
        } catch (error) {
          if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') throw error;
        }
      }}
    />
  );
}
```

4. In `onCredential`, pass the credential to the auth provider using its documented Sign in with Apple method. Some providers require a nonce; read the provider's docs rather than guessing the call.
5. `email` and `fullName` can be null, for example after the first sign-in. Save the name on first sign-in, and do not make a later sign-in fail because they are missing.
6. Send `authorizationCode` to the backend if it will need to revoke Apple tokens on account deletion (see `account-deletion`).
7. Decide account linking: a user who signed up with Google and later uses Apple with the same email. Follow what the provider supports; do not merge accounts on an unverified email.

`expo-apple-authentication` supports iOS and tvOS only. `isAvailableAsync` returns false elsewhere, so the button hides itself on Android. Our sources record no Play rule requiring an equivalent login; do not add one to Android for Play's sake.

Bare React Native or native iOS: add the Sign in with Apple capability to the app target and use the project's existing Apple sign-in library or `AuthenticationServices`.

## 3. Payments: guideline 3.1.1

Digital content and features unlocked in the app use in-app purchase, with a way to restore purchases. Unlocking digital content through license keys, QR codes, crypto or similar instead of in-app purchase is rejected.

For each paid item from the inventory:

- **Digital, sold through IAP already.** Check that restore exists and is reachable without buying again: a "Restore purchases" control on the paywall and in settings. With RevenueCat it calls `Purchases.restorePurchases()`; for other libraries, read their docs for the restore call. Check the app reads entitlements after restore.
- **Digital, sold any other way** (Stripe in the app, a key or code entry, a web view checkout, crypto). Replace it with IAP on iOS, or remove that path from the iOS build. If the user wants to keep web sales, see external links below.
- **Physical goods or services used outside the app.** Our sources do not cover these. Read guideline 3.1 on https://developer.apple.com/app-store/review/guidelines/ and record what it says, with the section number, in the decision record.
- **Anything that does not fit** (reader apps, tips, person-to-person services): read 3.1 on the guidelines page; record the open question rather than guessing.

### External purchase links

- **US storefront:** since 2025-05-01, apps may include buttons, external links and calls to action for purchases without an entitlement. https://developer.apple.com/news/?id=9txfddzf
- **Other storefronts:** our sources do not cover them. Read 3.1.1(a) on the guidelines page, and Apple's StoreKit External Purchase documentation on developer.apple.com, before showing a link outside the US. Note the 2026-10-16 change: the music streaming entitlement was folded into the StoreKit External Purchase Link entitlements.
- If the app shows an external link only in some storefronts, gate it on the user's App Store storefront as reported by StoreKit, not on device locale, language or IP.
- An external link does not remove the restore requirement for anything sold through IAP.

Code changes: match the project's purchases library and paywall components. Keep the IAP flow the default path on iOS.

### Review readiness for paid features

- Every IAP product the build offers must be reviewable: in-app purchases that cannot be reviewed are a 2.1 rejection. Check each product the code references exists in App Store Connect, and explain anything the reviewer cannot reach on their own in Review Notes (2.1(b)).
- Subscriptions: the reviewer needs a working demo account and an account with an expired subscription. Pass both to `review-notes`; ask the user for the expired one.
- Account deletion must tell App Store subscribers that Apple billing continues until they cancel (see `account-deletion`).

## 4. Google Play payments

Read [references/play-billing.md](references/play-billing.md) and the policy pages it links. Record in the decision record what each page says about the app's paid items, with URL and the date read. If the Android build sells digital content outside Google Play's billing, mark it `open` with the question until the policy pages answer it. Do not apply Apple's rules to Android, and do not invent Play rules.

## 5. Write the decision record

Write or replace the `## Login and payments` section in `store/review-risks.md` following [references/decision-record.md](references/decision-record.md). Keep every other section of the file unchanged. One finding per issue: rule, evidence (file and line), exception considered, decision, change, status, sources. List what you checked and found fine.

## Verify

- [ ] Every social or third-party login found in step 1 is covered by a 4.8 finding: resolved by Sign in with Apple, or by a recorded exception with evidence.
- [ ] If Sign in with Apple was added: `expo-apple-authentication` is in `plugins`, `ios.usesAppleSignIn` is `true`, the button renders only when `isAvailableAsync` is true, cancellation does not show an error, and a null `email` or `fullName` does not break sign-in.
- [ ] Every digital item sold on iOS goes through IAP, and "Restore purchases" is reachable from the paywall and from settings.
- [ ] No license key, QR code or crypto path unlocks digital content in the iOS build.
- [ ] Any external purchase link is shown only in storefronts where the decision record says it is allowed, gated on the App Store storefront.
- [ ] Play payments: each paid item on Android has a finding citing the Play policy pages, or "No payments on Android".
- [ ] `store/review-risks.md` has the `## Login and payments` section with today's date; other sections are unchanged; every Evidence path exists; no `open` finding is marked resolved.
- [ ] `npx store-ready check` no longer warns about third-party login without Sign in with Apple.
- [ ] Tell the user it passes the checks we know about. Do not say it will be approved.
