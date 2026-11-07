# Google Play: verified facts

Checked 2026-11-07 against official Google pages. Items marked **unconfirmed** were not found on an official page and must not be stated as fact in skills.

## Developer Program Policy

Source: https://play.google/developer-content-policy/ (play.google.com/about/developer-content-policy redirects here). A banner announces policy updates effective 2026-10-29.

Top-level areas: Restricted Content (UGC, Health, AI-Generated Content, Financial Services, Real-Money Gambling); Impersonation; Intellectual Property; Privacy, Deception and Device Abuse (User Data, Permissions, Device and Network Abuse, Deceptive Behavior, Misrepresentation, Target API Level); Use of SDKs in Apps; Monetization and Ads; Store Listing and Promotion (Metadata, Ratings/Reviews/Installs, Content Ratings); Spam, Functionality, and User Experience; Malware; Mobile Unwanted Software; Families; Enforcement.

Minimum and broken functionality (https://support.google.com/googleplay/android-developer/answer/9898783): static text or PDF-only apps, single-wallpaper apps and apps that do nothing are not allowed; apps that crash, freeze, fail to install or fail to load are rejected. Play Console pre-review checks flag issues before submission (https://support.google.com/googleplay/android-developer/answer/14807773). Repeated violations can lead to account suspension (https://support.google.com/googleplay/android-developer/answer/2477981).

Google publishes no ranked list of common rejection reasons; any "top reasons" ranking is **unconfirmed**.

## New personal developer accounts

- Testing requirement (https://support.google.com/googleplay/android-developer/answer/14151465): personal accounts created after 2023-11-13 must run a closed test with at least 12 testers opted in continuously for at least 14 days before applying for production access.
- Identity verification (https://support.google.com/googleplay/android-developer/answer/10841920, /answer/13628312, /answer/13634885): personal accounts use the legal name and address from the Google Payments profile and may need a government ID; organization accounts need a D-U-N-S number (can take 30+ days). One-time registration fee $25.
- Android developer verification (https://developer.android.com/developer-verification): enforcement began 2026-09-30 in Brazil, Indonesia, Singapore and Thailand for certified devices on Android 7+, global rollout in 2027. For most Play developers existing Play verification counts; new apps are registered when created in Play Console.

## Target API level

Source: https://developer.android.com/google/play/requirements/target-sdk

- From 2026-08-31 new apps and updates must target API 36 (Android 16). Wear OS and Automotive need 35; TV and XR need 34.
- Existing apps must target 35+ to stay visible to new users on newer Android versions.
- Extensions could be requested until 2026-11-01, which has passed.

## Declarations

- Data safety (https://support.google.com/googleplay/android-developer/answer/10787469): required for every app on closed, open or production tracks, even apps that collect nothing; must include data collected by SDKs and webviews; privacy policy required; inaccurate forms can block updates or remove the app.
- Account deletion (https://support.google.com/googleplay/android-developer/answer/13327111): apps that let users create an account must offer an in-app deletion path, a web link to request deletion without reinstalling, deletion of associated data (disclose anything retained), and declare it in the Data safety form.
- Photo and video permissions (https://support.google.com/googleplay/android-developer/answer/14115180): READ_MEDIA_IMAGES / READ_MEDIA_VIDEO only when the system photo picker cannot support core functionality, with a declaration.
- Background location (https://support.google.com/googleplay/android-developer/answer/9799150): declaration for one core feature, demo video of 30 seconds or less showing the prominent in-app disclosure and the runtime prompt, privacy policy covering location, test credentials if login is needed.
- Exact alarms (https://support.google.com/googleplay/android-developer/answer/16558241): USE_EXACT_ALARM only for alarm, timer or calendar apps with a declaration; others use user-granted SCHEDULE_EXACT_ALARM.
- Foreground services (https://support.google.com/googleplay/android-developer/answer/13392821): for target 14+, declare each type and its FOREGROUND_SERVICE_* permission; in App content give a description, the user impact if interrupted, a demo video and the use case.
- USE_FULL_SCREEN_INTENT is auto-granted only for alarm and calling apps (Android 14+). MANAGE_EXTERNAL_STORAGE, QUERY_ALL_PACKAGES and Accessibility API use need declarations.
- Content rating (https://support.google.com/googleplay/android-developer/answer/9898843, /answer/9859655): every app needs an IARC rating from the App content questionnaire; unrated apps can be removed; retake it when content changes.

## Store listing

- Text (https://support.google.com/googleplay/android-developer/answer/9859152): app name 30, short description 80, full description 4,000 characters. Keyword stuffing can lead to suspension.
- Graphics (https://support.google.com/googleplay/android-developer/answer/1078870): icon 512×512 32-bit PNG with alpha, up to 1024 KB; feature graphic 1024×500 JPEG or 24-bit PNG without alpha; at least 2 screenshots to publish, up to 8 per device type, JPEG or 24-bit PNG, each side 320–3840 px, longest side at most twice the shortest; for promotion eligibility at least 4 screenshots at 1080 px or more; video is an optional public or unlisted YouTube URL with ads off.

## App bundles and signing

- AAB required for new apps since August 2021 (https://developer.android.com/guide/app-bundle); APKs cannot be submitted for new apps.
- Play App Signing required for apps created after August 2021 (https://developer.android.com/studio/publish/app-signing). You sign with an upload key; Google holds the app signing key; a lost upload key can be reset.
