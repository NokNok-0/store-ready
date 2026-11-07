# Replies

## Apple: what the sources say

Source: https://developer.apple.com/help/app-review/after-submitting-for-review/contact-app-review

- Reply in App Store Connect with "Reply to App Review". Apple's help pages no longer call it "Resolution Center"; use the current name with the user.
- Be specific: name the feature, the guideline, and the steps to see it. If the reviewer misunderstood, explain the concept.
- Do not use the reply to appeal; appeals go to the App Review Board. Do not use it to request expedited review.
- The user can request a call. Include the time zone. Calls take 3–5 business days.
- Apple publishes no reply templates. The structure below is ours.

The App Review Board URL is not in our sources. Tell the user to start from https://developer.apple.com/distribute/app-review/ or the contact page above and use Apple's current link. Recommend it only after the reply route has been tried or when the user disagrees with the guideline's application after a clear explanation.

## Apple: structure

```
Hi,

<One or two sentences: what was wrong, in plain terms, and what changed. Name the guideline once.>

<Steps to see it, numbered, using the exact labels on screen. Include the account to use if it matters.>

<Only if needed: build number, where credentials are, or the concept the reviewer missed.>

<Name>
```

Rules:

- Under 150 words for a fix, under 250 when explaining a misunderstood concept.
- Labels in the steps match the code exactly ("Settings > Account > Delete account", taken from the screen titles and button text). Read them from the code; do not paraphrase.
- Say what was done, in the past tense. Not "we will", unless the fix needs Apple to do something first.
- One reply per rejection, covering every guideline it cites, in the order Apple listed them.
- If the fix is a new build, say which build number to review.
- If you are asking for nothing and changing nothing, because the reviewer misread the app, say so in the first sentence and explain the concept, then give steps. That is still a reply, not an appeal.

Do not write:

- apologies or thanks beyond one short word ("We sincerely apologize for any inconvenience", "Thank you for your patience and understanding");
- claims that cannot be checked ("fully compliant", "thoroughly tested");
- a request to speed up review;
- arguments with the guideline. If the user wants to argue, that is the App Review Board;
- passwords for real user accounts. Use the demo accounts only.

## Google Play: path

Sources: https://support.google.com/googleplay/android-developer/answer/10787469 (Data safety), https://support.google.com/googleplay/android-developer/answer/2477981 (suspension), https://play.google/developer-content-policy/ (policy centre, Enforcement section).

Play rejections are fixed in the app and in Play Console, not answered by message. The order:

1. Fix the cause in code, if code is the cause. Build with a higher versionCode (https://docs.expo.dev/submit/introduction/).
2. Fix the declarations in Play Console (App content: Data safety, permission declarations, content rating) so they match the new build.
3. Upload the fixed release to the track that was rejected and send it for review, or resubmit as the email and Play Console direct.
4. Appeal only if the decision is wrong: the app does not do what the email says, or the flagged code is not in the release. Use the appeal link in the email or Play Console. Our sources do not document the appeal steps; read the Enforcement section of the policy centre for the current process.

Tell the user that repeated violations can lead to account suspension, so a resubmission must change what the email names.

## Google Play: appeal text

Only when appealing. Same rules as Apple: specific, short, no filler.

```
<App name>, package <package>, version code <n>.

<One sentence: which policy the email cites and what it says the app does.>

<What the app actually does, with evidence a reviewer can check: the screen, the setting, the version that removed the SDK.>

<What you want: the decision reviewed.>
```
