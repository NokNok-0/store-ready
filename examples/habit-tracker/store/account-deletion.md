# Account deletion
In-app path: Today > Settings > Delete account
Delete account URL: https://github.com/NokNok-0/store-ready/blob/main/examples/habit-tracker/docs/delete-account.md (not opened yet: the repository is not public, so it returns 404; blocking until it is published)
Data kept after deletion: none (no server; `src/account.ts` deletes the profile, the habits and the habit photo files on the device)
Sign in with Apple tokens: none left the device (`src/components/apple-sign-in.tsx` keeps only `user` and `email` locally)

Accounts are created and operated offline. Google Play's policy says such accounts "are not app accounts and do not fall within policy scope" (https://support.google.com/googleplay/android-developer/answer/13327111). The app offers in-app deletion and the web page anyway.
