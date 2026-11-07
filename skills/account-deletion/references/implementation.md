# Reference implementation: Expo / React Native

A pattern, not a drop-in. Adapt names, routing, storage and UI components to what the project already uses. The example assumes Expo Router, `expo-secure-store` and AsyncStorage; swap in the project's equivalents.

## The flow

1. **Entry.** "Delete account" in the account or settings screen, where a user would look for it. Not behind support chat, not only on the website.
2. **Explain.** A screen or sheet that says what will be deleted, what is kept and for how long (if anything), and, for users with an App Store subscription, that Apple keeps billing until they cancel the subscription.
3. **Confirm.** One deliberate confirmation (a destructive button in an alert, or typing a word if the project already does that elsewhere). No retention offers or surveys in the way.
4. **Re-authenticate if needed.** If the backend or provider rejects a stale session, ask the user to sign in again and retry. For Sign in with Apple users without a stored refresh token, this is also where you get a fresh `authorizationCode` for revocation.
5. **Delete on the server.** One authenticated request. The server does all the work; the app never deletes server data piecemeal.
6. **Clean up locally.** Sign out of the provider SDK, delete secure-store keys, clear AsyncStorage and any local database or cached files, reset in-memory state.
7. **Leave.** Replace the navigation stack with the signed-out start screen and confirm the account was deleted.

## Client

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const SECURE_KEYS = ['auth.session', 'auth.refreshToken'];

export class ReauthRequiredError extends Error {}

export async function requestAccountDeletion(accessToken: string, appleAuthorizationCode?: string) {
  const res = await fetch(`${API_URL}/v1/account/delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appleAuthorizationCode }),
  });
  if (res.status === 401) throw new ReauthRequiredError();
  if (!res.ok) throw new Error(`Account deletion failed (${res.status})`);
}

export async function wipeLocalData() {
  await Promise.all(SECURE_KEYS.map((key) => SecureStore.deleteItemAsync(key)));
  await AsyncStorage.clear();
}
```

```tsx
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/useAuth';
import { ReauthRequiredError, requestAccountDeletion, wipeLocalData } from '@/account/deletion';

export default function DeleteAccountScreen() {
  const { getAccessToken, signOut, reauthenticate, hasAppStoreSubscription } = useAuth();
  const [busy, setBusy] = useState(false);

  async function deleteNow() {
    setBusy(true);
    try {
      await requestAccountDeletion(await getAccessToken());
      await signOut();
      await wipeLocalData();
      router.replace('/welcome?deleted=1');
    } catch (error) {
      if (error instanceof ReauthRequiredError) {
        Alert.alert('Sign in again', 'For your security, sign in again to delete your account.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => reauthenticate().then(deleteNow) },
        ]);
      } else {
        Alert.alert('Could not delete your account', 'Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    Alert.alert('Delete your account?', 'Your account, habits and photos will be permanently deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: deleteNow },
    ]);
  }

  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Text>Deleting your account removes your profile, habits, check-ins and photos from our servers.</Text>
      {hasAppStoreSubscription && (
        <Text>Your subscription is billed by Apple and continues until you cancel it in your Apple account settings. Deleting your account does not cancel it.</Text>
      )}
      <Pressable accessibilityRole="button" disabled={busy} onPress={confirm}>
        {busy ? <ActivityIndicator /> : <Text style={{ color: '#c62828' }}>Delete account</Text>}
      </Pressable>
    </View>
  );
}
```

Notes for adapting it:

- Replace `useAuth` with the project's auth hook. `getAccessToken` must return a token the backend verifies (Firebase ID token, Supabase access token, Clerk session token, Auth0 access token, or the project's own).
- For a Sign in with Apple user without a stored refresh token, get a new credential with `expo-apple-authentication` before calling `requestAccountDeletion` and pass its `authorizationCode`.
- Write the "what is deleted" text from what the backend actually deletes. Do not promise deletion of data you keep.
- Show the subscription notice from the real entitlement state (StoreKit, RevenueCat, or the project's own). For Play subscriptions, read https://support.google.com/googleplay/android-developer/answer/9900533 before writing the equivalent Android notice; our sources do not cover it.
- Clear every local store the app writes to. Search for `SecureStore.setItemAsync`, `AsyncStorage.setItem`, MMKV, SQLite, and files written under the document directory.

## Backend: what the endpoint must do

One endpoint (`POST /v1/account/delete` above, or a callable function) that:

1. Verifies the caller's token with the provider's server SDK. Never trust a user ID sent in the body.
2. If the user signed in with Apple: exchanges the `authorizationCode` if one was sent, then revokes the user's Apple tokens through Apple's REST API (see [providers.md](providers.md)).
3. Deletes the user's data in every store you control: database rows (including rows that only reference the user), files in object storage, search indexes, caches, queued jobs.
4. Deletes or anonymises the user in third-party services that hold their data under their ID (analytics, crash reporting, email, support desk), where those services offer an API for it. List the ones that do not, as retained data.
5. Deletes the user in the auth provider last, so a failure earlier can be retried while the user can still authenticate.
6. Keeps only what must be kept (for example payment records required by law), and records it in the retention disclosure that the web page and the Data safety form show.
7. Returns success only when the deletion is done or durably queued. If it is queued, the in-app text says when it completes.
8. Is idempotent: a retry after a timeout must not fail because half the data is already gone.

```ts
export async function deleteAccount(req: Request): Promise<Response> {
  const user = await verifyRequest(req);
  if (!user) return new Response(null, { status: 401 });

  const { appleAuthorizationCode } = await req.json().catch(() => ({}));
  if (user.providers.includes('apple')) {
    await revokeAppleTokens(user, appleAuthorizationCode);
  }

  await deleteUserRows(user.id);
  await deleteUserFiles(user.id);
  await deleteFromThirdParties(user.id);
  await deleteAuthUser(user.id);

  return new Response(null, { status: 204 });
}
```

Each helper is project-specific: implement it against the project's database, storage and provider. Provider calls for `deleteAuthUser` are in [providers.md](providers.md).

If the project has no backend at all (local-only data plus a hosted auth provider), the deletion still belongs on a server: deleting a user and all of their data needs privileged credentials, and those must not ship in the app. Add a minimal function on the provider's platform (Cloud Function, Edge Function) or the project's existing hosting, and tell the user it is a new deployed piece.
