# Writing the listing

The listing has two readers: a person deciding whether to install, and a reviewer checking that the text matches the build. Both want the same thing: what the app does, said plainly.

## General rules

- Lead with what the user can do. Start sentences with a verb the user performs: "Track", "Plan", "Scan", "Log".
- Name things the way the UI names them. If the button says "Check in", the description says "check in", not "log your progress".
- One claim per sentence. Every claim maps to a feature in the inventory.
- Say what is limited. "Free for up to 3 habits; a subscription unlocks unlimited habits and export." No prices, no "only $X".
- No superlatives, rankings, emoji, exclamation marks, or rhetorical questions ("Tired of forgetting your habits?"). The one exception is a UI label that contains such a word ("Best streak" on a stat tile): name it as the UI does, in descriptions only, and pass it to `measure.mjs` with `--allow`. Never in the name, subtitle or title.
- No claims about other people: user counts, ratings, press, "trusted by".
- No other platforms, apps or companies, except a real integration named the way its owner names it (for example "Imports from Apple Health" when the app does).

## Apple fields

### name (2–30 characters)

Format: `<Brand>` or `<Brand>: <plain descriptor>` or `<Brand> - <plain descriptor>`.

| Good | Bad | Why bad |
|---|---|---|
| `Tally: Habit Tracker` | `Tally - Best Habit Tracker Free` | superlative, price word |
| `Tally` | `Tally Habit Goal Routine Streak` | keyword stuffing (2.3.7) |

### subtitle (30 characters)

A verb phrase, not a slogan. Do not repeat the name.

| Good | Bad |
|---|---|
| `Build daily routines` | `The ultimate habit app` |
| `Log habits, see your streaks` | `Tally habit tracker` |

### keywords (100 bytes)

- Comma separated, no spaces: `streak,routine,goal,daily,checklist`.
- Words, not phrases, unless the phrase is how people search and its words are not useful alone.
- Leave out every word already in the name.
- Leave out other apps' names, company names and trademarks. The keywords rule forbids them.
- Leave out the category name and the word "app" only if you are short of bytes; they are not forbidden.
- Prefer one form of a word. Do not spend bytes on both singular and plural without a reason.
- Use the space for accurate, relevant search terms only. Unused bytes are fine; do not add weak or unrelated words to reach 100 (2.3.7: keywords must accurately describe the app).

Count with the script, not by eye. A keyword string that looks short in Japanese or German can be over 100 bytes.

### description (4,000 characters, plain text)

Structure:

```
<One sentence: what the user can do with the app.>

<One or two sentences on how it works, in the user's terms.>

- <Feature, as a user action>
- <Feature>
- <Feature>

<What is free and what a subscription or purchase adds, without prices.>

<Support line, if the app has a support page or contact address: "Questions or problems: support@example.com">
```

Long is not better. Most good descriptions are 600–1,500 characters. Stop when the features run out.

Example:

```
Tally helps you build daily habits by checking them off and watching your streaks grow.

Add a habit, set how many times a day you want to do it, and check it off from the home screen. Tally keeps your history on your device.

- Create habits with a name, icon and daily target
- Check off today's habits from one list
- See weekly and monthly streaks for each habit
- Get an optional reminder at a time you choose

Tally is free for up to 3 habits. Tally Pro, a subscription, unlocks unlimited habits and CSV export.

Questions or problems: support@tally.example
```

### promotionalText (170 characters)

Can change without a new build, so use it for what is current: a recent feature, a seasonal use. Still factual, still no prices.

`New in this version: monthly streak view and reminders per habit.`

### whatsNew (4,000 characters)

User-visible changes only, one per line, past tense or plain noun phrase. No "bug fixes and performance improvements" on its own if you can name the fixes.

```
- Monthly streak view
- Reminders can now be set per habit
- Fixed: streak reset when the phone changed time zone
```

## Google Play fields

### title (30 characters)

Usually the same as the Apple `name`. Same rules.

### shortDescription (80 characters)

One sentence on what the user can do. It shows above the fold, so it carries the most weight.

`Check off daily habits and see your streaks for each one.`

### fullDescription (4,000 characters)

Same structure and example as the Apple description. Do not repeat search terms to raise ranking; Google treats keyword stuffing as a policy violation. Do not mention iPhone, iOS or the App Store.

## Localization

store-ready v1 writes English only. If the user asks for another language, write it as `store/listing.ios.<locale>.json` and `store/listing.android.<locale>.json` with the same keys, and pass each file to the measuring script (`node scripts/measure.mjs store/listing.ios.de-DE.json`). Limits are the same, but keyword byte counts change a lot.
