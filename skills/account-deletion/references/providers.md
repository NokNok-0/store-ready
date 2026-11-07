# Auth providers: what each gives you for deletion

Only what was confirmed on each provider's documentation on 2026-11-07 is stated here. For anything else, read the provider's current docs; APIs and dashboard options change.

## Detect the provider

| Signal | Provider |
|---|---|
| `@react-native-firebase/auth`, or `firebase` with imports from `firebase/auth` | Firebase Authentication |
| `@supabase/supabase-js` and calls to `supabase.auth` | Supabase Auth |
| A package under `@clerk/` | Clerk |
| `react-native-auth0` in the app, `auth0` in the backend | Auth0 |
| Own `/login`, `/signup` or `/token` endpoints, sessions or JWTs issued by the project's backend | Custom |
| `expo-apple-authentication`, `@invertase/react-native-apple-authentication`, or an Apple provider configured in one of the above | Sign in with Apple (alongside the main provider) |

An app can have more than one. Check the backend too: a Firebase app may also keep user rows in Postgres; a Supabase app may upload to S3.

Whatever the provider, deleting the login record is never the whole job. The provider deletes its own user record; your data in your database, file storage, and other services stays until you delete it.

## Firebase Authentication

- Admin SDK, server side: `getAuth().deleteUser(uid)` deletes the user record. https://firebase.google.com/docs/auth/admin/manage-users
- Run it from a backend you control (a Cloud Function or your own server) after verifying the caller's ID token, together with deleting the user's Firestore, Realtime Database and Cloud Storage data.
- Prefer this over deleting the user from the client: that removes only the auth record and leaves the user's data behind unless every collection has its own cleanup.
- For Sign in with Apple users, check Firebase's current docs for how it handles Apple token revocation before writing your own call.

## Supabase Auth

- `supabase.auth.admin.deleteUser(id, shouldSoftDelete)` deletes the user. It needs the `service_role` key, which must never be in the app; call it from a server or Edge Function only. https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
- With `shouldSoftDelete: true` the user is soft-deleted from the auth schema; per that page this is not reversible but still allows identifying the user from a hashed ID. For store deletion, hard delete unless the project's retention policy says otherwise, and disclose what is kept.
- Rows in your own tables are removed only if their foreign keys to the user cascade, or if you delete them first. Check each table that holds user data. Delete the user's files in Storage explicitly.
- For Sign in with Apple users, check Supabase's current docs for Apple token revocation support; if there is none, call Apple's REST API from the same function.

## Clerk

- Backend SDK: `clerkClient.users.deleteUser(userId)`. https://clerk.com/docs/reference/backend/user/delete-user
- Call it from your backend after verifying the session, and delete your own data for that user in the same request.
- Whether users can delete themselves from the frontend SDK, and how Clerk handles Apple token revocation, are not confirmed here: read Clerk's docs.

## Auth0

- Management API: `DELETE /api/v2/users/{id}`, scope `delete:users` (or `delete:current_user`). https://auth0.com/docs/api/management/v2/users/delete-users-by-id
- Call it from your backend with a Management API token. Never ship a Management API token in the app.
- For Sign in with Apple through Auth0, read Auth0's docs for Apple token revocation before writing your own call.

## Custom auth

- Delete the user row, every row that references it, their files, sessions and refresh tokens, and any password reset or verification tokens.
- Invalidate every session the user has, not only the current one.

## Sign in with Apple token revocation (any provider)

Apps that use Sign in with Apple must revoke the user's tokens through Apple's REST API when the account is deleted. Source: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion

The revocation request needs a token Apple issued for this user and a client secret signed with the team's Sign in with Apple key. Two ways to have that token:

1. **At sign-in.** The credential from `expo-apple-authentication` includes `authorizationCode`, a short-lived proof of authorization for your server (https://docs.expo.dev/versions/latest/sdk/apple-authentication/). Send it to the backend, exchange it with Apple for tokens, and store the refresh token server side.
2. **At deletion.** Ask the user to sign in with Apple again in the deletion flow, send the fresh `authorizationCode` to the backend, exchange it, then revoke. This works for users who signed in before you stored anything.

Endpoint, parameters and client-secret format: read https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api and https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens before writing the call. The signing key is a secret: it lives in the backend's secret store, never in the app or the repository.

If the auth provider already revokes Apple tokens on user deletion, confirm it in the provider's docs, note the page in the deletion record, and do not revoke twice.
