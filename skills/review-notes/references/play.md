# Google Play: access instructions for reviewers

## What the sources say

| Fact | Source |
|---|---|
| Play Console's App content page holds the forms you complete before release, including sign-in details for restricted parts of the app. | https://support.google.com/googleplay/android-developer/answer/9859455 ("Prepare your app for review", checked 2026-11-07) |
| Apps that crash, freeze, fail to install or fail to load are rejected; apps that do nothing are not allowed. | https://support.google.com/googleplay/android-developer/answer/9898783 |
| A background location declaration needs: one core feature, a demo video of 30 seconds or less showing the prominent in-app disclosure and the runtime prompt, a privacy policy that covers location, and test credentials if login is needed. | https://support.google.com/googleplay/android-developer/answer/9799150 |
| Foreground service declarations (target 14+) need a description, the user impact if interrupted, a demo video and the use case. | https://support.google.com/googleplay/android-developer/answer/13392821 |

Our sources do not list the exact fields of the sign-in section (how many credential sets, field lengths). Open App content in Play Console, read the section as shown, and fit the text in `store/app-access.android.txt` to its fields.

## How it differs from Apple's notes

- Play's sign-in section may split credentials and instructions into separate fields; read it in the Console. Write one block per credential set so each can be pasted on its own.
- Permission declarations (background location, foreground services, photo and video, exact alarms) have their own forms and videos. The play-data-safety skill covers those; do not put them in the app access text.
- Our sources give no length limit for this text. Keep it as short as the Apple notes anyway; the same reviewer questions apply.
