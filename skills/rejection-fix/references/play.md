# Google Play policies: cause, where to look, fix

From `docs/sources/google-play.md` (checked 2026-11-07). Policy centre: https://play.google/developer-content-policy/. If the email names a policy not listed here, open the link in the email or find the policy in the policy centre, read it in full, and work from its text.

"Release" says whether the fix needs a new app bundle. Code and manifest changes do, with a higher versionCode (https://docs.expo.dev/submit/introduction/). Declarations and forms are changed in Play Console. Our sources do not say whether a corrected form alone clears a rejected release; follow what the email and Play Console say after you save the change.

---

### Data safety

- Causes: form missing; form does not match what the app or its SDKs and web views collect or share; privacy policy missing.
- Look: every SDK in `package.json` and Gradle dependencies; read each SDK's own data disclosure documentation; web views that load third-party pages; `store/data-safety.android.md`.
- Fix: correct the form to include SDK and web view data. If the app should not collect the data, remove or configure the SDK instead and ship a new release. Inaccurate forms can block updates or remove the app.
- Owner: `play-data-safety`. Release: only if code changes.
- Source: https://support.google.com/googleplay/android-developer/answer/10787469

### Account deletion

- Causes: accounts can be created but there is no in-app deletion path, no web link to request deletion without reinstalling, associated data is not deleted, or the form does not declare it.
- Fix: all four. Disclose any data that is retained.
- Owner: `account-deletion`, then `play-data-safety`. Release: yes if the in-app path is missing.
- Source: https://support.google.com/googleplay/android-developer/answer/13327111

### Photo and video permissions

- Cause: READ_MEDIA_IMAGES or READ_MEDIA_VIDEO when the system photo picker would do.
- Fix: switch to the photo picker and remove the permissions (including ones added by libraries), or declare why core functionality needs them.
- Release: yes when removing. Source: https://support.google.com/googleplay/android-developer/answer/14115180

### Background location

- Causes: no declaration; more than one core feature; demo video missing, over 30 seconds, or not showing the prominent in-app disclosure and the runtime prompt; privacy policy does not cover location; no test credentials when login is needed.
- Fix: remove background location if not core, or fix each item above.
- Release: yes when removing. Source: https://support.google.com/googleplay/android-developer/answer/9799150

### Exact alarms

- Cause: USE_EXACT_ALARM in an app that is not an alarm, timer or calendar app.
- Fix: switch to user-granted SCHEDULE_EXACT_ALARM.
- Release: yes. Source: https://support.google.com/googleplay/android-developer/answer/16558241

### Foreground services

- Cause: for target 14+, a foreground service type not declared with its FOREGROUND_SERVICE_* permission, or App content missing the description, user impact if interrupted, demo video or use case.
- Fix: declare each type and fill App content; remove services the app does not need.
- Release: yes if the manifest changes. Source: https://support.google.com/googleplay/android-developer/answer/13392821

### Other sensitive permissions

- USE_FULL_SCREEN_INTENT is auto-granted only for alarm and calling apps (Android 14+). MANAGE_EXTERNAL_STORAGE, QUERY_ALL_PACKAGES and Accessibility API use need declarations.
- Fix: remove the permission, or declare it if the use fits. Recorded in our sources without a page URL: read the Permissions section of the policy centre.

### Target API level

- Cause: from 2026-08-31 new apps and updates must target API 36 (Wear OS and Automotive 35; TV and XR 34). Extension requests closed on 2026-11-01.
- Fix: raise `targetSdkVersion`. On Expo, SDK 58 defaults to 36 (https://expo.dev/changelog/sdk-58); on older SDKs, upgrade Expo or raise the target in the Android build config, following the Expo docs for that SDK.
- Release: yes. Source: https://developer.android.com/google/play/requirements/target-sdk

### Minimum and broken functionality

- Causes: static text or PDF-only app, single wallpaper, app that does nothing; crash, freeze, failure to install or load.
- Fix: for content-only apps, product work (see `app-review-risk` A1 and A8). For crashes, ask the user for any crash details the email or Play Console gives; you cannot reproduce from files.
- Release: yes. Sources: https://support.google.com/googleplay/android-developer/answer/9898783; pre-review checks https://support.google.com/googleplay/android-developer/answer/14807773

### Metadata and listing

- Causes: title over 30, short description over 80, full description over 4,000 characters; keyword stuffing (can lead to suspension); graphics wrong size or format.
- Owner: `store-listing`, `store-screenshots`. Release: no.
- Sources: https://support.google.com/googleplay/android-developer/answer/9859152; https://support.google.com/googleplay/android-developer/answer/1078870

### Content rating

- Cause: no IARC rating, or answers no longer match the content.
- Fix: complete or retake the App content questionnaire.
- Owner: `age-rating`. Release: no. Sources: https://support.google.com/googleplay/android-developer/answer/9898843; https://support.google.com/googleplay/android-developer/answer/9859655

### Production access for new personal accounts

- Cause: personal account created after 2023-11-13 applied before a closed test with at least 12 testers opted in continuously for 14 days.
- Fix: run or finish the closed test, then apply again. No code change fixes this.
- Source: https://support.google.com/googleplay/android-developer/answer/14151465

### Policies our sources name but do not detail

Impersonation; Intellectual Property; User Generated Content; AI-Generated Content; Health; Financial Services; Real-Money Gambling; Spam; Deceptive Behavior; Misrepresentation; Families; Malware; Mobile Unwanted Software; Monetization and Ads. For any of these, read the policy from the link in the email, quote the sentence the app breaks back to the user, and fix against that.

### Enforcement

Repeated violations can lead to account suspension (https://support.google.com/googleplay/android-developer/answer/2477981). Tell the user this when a rejection repeats: resubmitting the same thing unchanged is the worst option. The policy centre has an Enforcement section; read it for the current appeal process. Our sources do not document the appeal steps.
