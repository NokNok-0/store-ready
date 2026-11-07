# Finding the facts in the code

For each topic: what to look for, where, and what counts as a "yes". Record every finding with a file path and, where useful, a line number. Absence of evidence is "not found", not "no": say which places you looked.

Dependencies are clues, not proof. A chat SDK in `package.json` that is never imported is not chat. Confirm each dependency hit by finding where it is used.

## User-generated content (UGC)

Look for: text inputs whose value is sent to a server and shown to other users; image or video upload (`expo-image-picker`, `react-native-image-picker`, camera) followed by an upload call; tables or collections named `posts`, `comments`, `reviews`, `messages`, `stories`; profile fields visible to others.

Yes if: content one user creates can be seen by another user.

Also record whether the app has: a report button, a block-user action, a content filter, and a published contact. Apple 1.2 requires all four for UGC; their absence is a review risk to report, not an age-rating answer.

## Chat and messaging

Look for: `stream-chat*`, `@sendbird/*`, `react-native-gifted-chat`, Twilio Conversations, Firebase or Supabase realtime subscriptions on a messages table, WebSocket clients sending messages.

Record: one-to-one or group; with known contacts, matched strangers, or anyone; whether it is random or anonymous (Apple puts random or anonymous chat under 1.2); whether images or voice can be sent.

## Social features

Look for: follow/unfollow, friends, public profiles, a feed of other users' content, likes, comments, sharing to other users inside the app, user search.

These feed Apple's social-media capability questions. Record each capability separately; the questions are specific.

## Location shared with other people

Look for: `expo-location`, `react-native-geolocation-service`, `navigator.geolocation`, background location, map views showing other users, coordinates written to a shared table or sent to other users, "share my location" or "live location" features.

Separate two cases and record which applies:

- Location used only by the app or its server for the user's own benefit (local weather, nearby search). This is a privacy matter, not obviously the Shared Location descriptor.
- Location visible to other users. This is what the Shared Location descriptor is about.

Read Apple's definition in the questionnaire before answering; our sources name the descriptor but do not define it.

## Dating and relationships

Look for: matching, swiping, "match", "date", "partner", relationship-seeking profile fields, compatibility scores, meeting strangers.

If the app's purpose includes finding dates or relationships, the Dating & Relationships descriptor applies and Apple rates the app 18+.

## Unrestricted web access

Look for: `react-native-webview` or `WebView` loading a URL that the user types or that comes from user content; `expo-web-browser` or `Linking.openURL` with user-supplied URLs; an in-app browser; HTML5/JS mini apps or games loaded at runtime (Apple 4.7).

Yes if: the user can reach arbitrary web content from inside the app. Fixed pages you control (privacy policy, help) are not unrestricted access.

## Gambling, contests and random rewards

Look for: real-money betting or wagering; simulated casino games (slots, poker, roulette) with no real money; paid random rewards (loot boxes, gacha, mystery packs); sweepstakes, contests, prize draws.

Record which kind. Real-money gambling is a restricted area on Play and a 5.1.1(ix) regulated field on Apple (submitted by the legal entity); flag it to the user as more than an age-rating answer.

## Mature or sensitive themes in the app's own content

Read the app's bundled content, not just its code: string files, translation files, bundled images and videos, seed data, game content, prompts sent to AI models.

Record anything involving: violence (cartoon, realistic), sexual content or nudity, profanity or crude humor, alcohol, tobacco, drugs, horror or fear themes, medical or treatment information, mature or suggestive themes.

## AI-generated content

Look for: calls to OpenAI, Anthropic, Google, Replicate, Stability or similar APIs; image or text generation features; chatbots.

Record: what the user can generate, whether outputs are filtered, and whether outputs can be shared with other users. Apple's 1.2 covers nonconsensual intimate imagery including AI-generated; Play has an AI-Generated Content restricted area. Unfiltered generation can produce content above any rating you choose.

## Advertising

Look for: `react-native-google-mobile-ads`, AppLovin, Unity Ads, ironSource, Meta Audience Network, AdColony, Vungle, or any ad SDK in native dependencies.

Record: which SDK, which ad formats, and whether any setting in code limits ad content by maturity. Ads are content the user sees; if nothing in code limits them, ask the user how the ad network's content settings are configured.

## Purchases

Look for: `react-native-purchases` (RevenueCat), `react-native-iap`, `expo-iap`, StoreKit or Play Billing code, paywall screens.

Record: subscriptions, consumables, non-consumables, and what they unlock. Some questionnaires ask about purchases; have the answer ready.

## Age and audience

Look for: a birth-date or age field, an age gate, parental controls, kid modes, content aimed at children (art style, copy).

Record whether the app collects age and what it does with it. If children are an intended audience, the Play Families policy applies; tell the user to read it.
