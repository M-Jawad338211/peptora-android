# App Store submission

Everything App Store Connect needs for the resubmission of Peptora after the rejection of
3 August 2026 (submission `4f9c00fa-5edf-4816-b2e8-cf6e7a67b17e`: guidelines 1.4.2, 5.1.1(v)
and 3.1.1). The text blocks below are ready to paste. Building and uploading are covered in
[RELEASING.md](RELEASING.md).

What Apple asked for, and where it was answered:

| Guideline | What Apple said | What changed |
| --- | --- | --- |
| 1.4.2 | The app calculates medical dosages and does not come from a manufacturer or institution | The app no longer supplies or suggests any amount. The calculator converts numbers the user types and nothing else. See [If 1.4.2 comes back](#if-142-comes-back). |
| 5.1.1(v) | No account deletion in the app | Profile, Account, Delete account. Deletes on the server at once. |
| 5.1.1(v) | Sign-up wall (May rejection) | The library and the calculator open without an account. |
| 3.1.1 | Paid content with no In-App Purchase | Peptora Pro is sold in the app as two auto-renewable subscriptions. |
| 1.4.1 | No citations (May rejection) | Every library entry lists its sources as links. |

## Before you submit

Do these in order. Each one can stop a review on its own.

1. **Paid Apps Agreement.** App Store Connect, Business, Agreements. It must say Active. While it
   says New, the App Store returns no products, the subscription screen shows "Plans could not be
   loaded", and App Review will reject the build for it.
2. **Deploy the API first**, then the web app and the admin panel. The new build calls
   `/auth/delete-account`, `/iap/apple/verify` and the public `/peptides`, which only exist in
   the new API. The API's start command runs the database migration.
3. **Check the library has sources.** From `peptora-api/`:
   `python -m scripts.check_library_sources`. It lists any entry that would be shown without a
   Sources section. Give those entries sources, or remove them, before review.
4. **Demo accounts.** Two accounts on production, both with a verified email and both without
   Peptora Pro (check in the admin panel that the plan reads Free): one for the sign-in fields,
   one spare in case the reviewer deletes the first. Do not use either of them for the screen
   recording below, because the recording ends with the account deleted.
5. **Build and upload** (`npm install`, `npm run bump`, `npm run prebuild:clean`,
   `npm run build:ios`, `npm run submit:ios`). Build 5 is already in App Store Connect, so the
   bump is needed.
6. **On a real iPhone, from TestFlight:** buy a subscription with a sandbox tester, restore it,
   and delete an account. Record the deletion (see [Screen recording](#screen-recording-for-511v)).
   Take the store screenshots at the same time.
7. **App Store Connect:** paste the text below, replace the screenshots, complete the two
   subscriptions, update App Privacy, set the notification URLs.
8. **Add for Review:** the app version, the subscription group and both subscriptions, all in
   one submission.

## Version page

**Promotional text** (160 of 170 characters)

```
Record the schedule you set and log each entry with one press and hold. A free peptide library with cited sources is included. Peptora does not recommend doses.
```

**Keywords** (97 of 100 characters)

```
peptides,reconstitution,vial,syringe,units,log,schedule,journal,reference,library,stack,bac water
```

The current keywords include `dose calculator`. That phrase has to go: it describes exactly what
guideline 1.4.2 does not allow from an individual developer.

**Description**

```
Peptora is a tracking and reference app for people who already follow a peptide protocol. It keeps a record of the schedule you set and the entries you log. It does not recommend doses, it does not sell peptides or medication, and it is not medical advice.

FREE, NO ACCOUNT NEEDED

Peptide library
Reference pages for individual peptides and for common stacks: what each one is, its regulatory status, storage and handling, and what the published research reports. Every page lists its sources, and each source opens the original paper or label.

Reconstitution calculator
Arithmetic for a vial you have already mixed. You type the vial amount, the water you added and the amount you want to measure, and Peptora converts between amount, volume and syringe units. A vial and syringe on screen follow your numbers, and you can drag the plunger to read units back as an amount. Every number is yours. Peptora never fills one in for you.

PEPTORA PRO

Protocols
Save a protocol for each vial you track: its name, your vial and water amounts, the amount and frequency you set, and your notes.

Press and hold to log
Log an entry with one press and hold. Each entry is saved with its time, and you can add a note.

Log and history
See what you logged and when, on every device you sign in to.

SUBSCRIPTION

The library and the calculator are free. Peptora Pro is an auto-renewing subscription, available monthly or yearly. The yearly plan starts with a 7-day free trial for new subscribers. Payment is charged to your Apple ID when you confirm the purchase. The subscription renews automatically unless it is cancelled at least 24 hours before the end of the current period. You can manage or cancel it at any time in your App Store account settings.

YOUR ACCOUNT

Pro needs an account, because your protocols and your log are stored with it. You can delete your account, and everything stored with it, at any time from Profile in the app.

Peptora is a tracking and reference tool. It is not a medical device and it does not diagnose, treat or prevent any condition. Talk to a qualified clinician about your own protocol.

Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://peptora.io/privacy-policy
```

Apple requires the Terms of Use and Privacy Policy links in the description of an app that sells
auto-renewable subscriptions (guideline 3.1.2). Keep the last two lines.

**Unchanged:** name `Peptora`, subtitle `Peptide protocol tracker`, category Health & Fitness,
support URL `https://peptora.io/support`, marketing URL `https://peptora.io`, licence agreement
Apple's standard one.

## Screenshots

The five screenshots in App Store Connect show the old app, including the screen titled
"Results for BPC-157". Replace all of them. A reviewer compares screenshots with the build, and
the old ones show the feature Apple rejected.

Take them on the iPhone 6.9 inch simulator or device (1320 x 2868), which App Store Connect scales
for the smaller sizes:

1. Home, signed in, with a few protocols
2. Protocols: a protocol open, with the vial and syringe and "Hold to log"
3. The log on that protocol, with several entries
4. Library: the list
5. Library: one entry scrolled to its Sources section
6. Calculator with your own numbers typed in (leave this one out if the calculator is switched off)

## App Review Information

**Sign-in required:** yes. User name and password of the first demo account.

**Notes** (3,168 of 4,000 characters)

```
Thank you for the feedback on submission 4f9c00fa-5edf-4816-b2e8-cf6e7a67b17e. This build changes the app to resolve each point. Details below.

WHAT THE APP IS
Peptora is a tracker and reference app. A user records the schedule they have set for themselves and logs entries. The app never recommends, suggests or pre-fills an amount.

GUIDELINE 1.4.2
The earlier build filled in amounts from our library and suggested a frequency. That has been removed.
1. No amount, range or frequency is supplied by the app anywhere. Every number on every screen is typed by the user.
2. Library pages are reference reading. The figures they report are shown with their sources and are never copied into the calculator or into a protocol.
3. The Calculator tab is a reconstitution (unit conversion) tool. The user types the vial amount, the water added and the amount they have already decided on. The app converts between mg, mL and syringe units and shows its working. It holds no drug data and makes no recommendation.
4. The app opens on a Home screen, not on the calculator, and the store listing no longer describes a dose calculator.

GUIDELINE 1.4.1
Every library page has a Sources section. Each source is a link to the original publication (PubMed, DOI or the regulator's label).

GUIDELINE 5.1.1(v): ACCOUNT DELETION
Account deletion is in the app, start to finish:
Profile tab > Account > Delete account > enter the password > press and hold "Hold to delete my account" until the bar fills.
The account and everything stored with it are deleted on our server at once, the app signs out and shows a confirmation. Nothing is sent to a website or to customer service. A screen recording of this flow on a physical iPhone is attached to this submission.

GUIDELINE 5.1.1(v): NO ACCOUNT REQUIRED
The Library and the Calculator work without an account. An account is needed only for Peptora Pro, because saved protocols and the log are stored with the account on our server.

GUIDELINE 3.1.1: IN-APP PURCHASE
Peptora Pro is now sold in the app with In-App Purchase, as auto-renewable subscriptions in the group "Peptora Pro":
- app.peptora.pro.yearly (7-day free trial for new subscribers)
- app.peptora.pro.monthly
To see it: sign in with the demo account, open the Protocols tab and tap "See plans", or open Profile > Subscribe. The screen shows each plan's price and period from the App Store, the renewal terms, Restore Purchases, Terms of Use and Privacy Policy. Restore Purchases is also in Profile.
The app has no link, button or text that leads to any other way of paying. Customers who bought access on our website can sign in and use it, as guideline 3.1.3(b) allows, and the same features can be bought in the app.

DEMO ACCOUNT
The demo account in the sign-in fields has no Peptora Pro, so the subscription screen appears. If you delete it while testing account deletion, you can create a new account in the app (Profile > Create Account). A verification code is emailed to the address you enter.

NOTIFICATIONS
After sign-in the app asks for permission to send notifications. It sends at most one reminder a week and works without them.

Thank you for your time.
```

If you have a spare demo account, add one line under DEMO ACCOUNT: `A second account without
Peptora Pro: <email> / <password>`.

Only keep the sentence "Every library page has a Sources section" if step 3 of the checklist
came back clean.

**Attachment:** the screen recording described next.

## Screen recording for 5.1.1(v)

Apple asked for "a screen recording captured on a physical device" that shows signing in,
reaching the deletion option, and the whole deletion flow through to its confirmation.

1. Create a throwaway account first (in the app or on the web) and verify its email. Not a demo
   account: this one will be deleted.
2. On the iPhone, add Screen Recording to Control Centre and start it.
3. Open Peptora. Profile, Log In, sign in with the throwaway account.
4. Profile again, scroll to Account, tap **Delete account**.
5. Let the "What is deleted" list stay on screen for a moment. Type the password.
6. Press and hold **Hold to delete my account** until the bar fills.
7. Wait on "Your account has been deleted", then tap Done. Profile now reads "You are not
   signed in".
8. Optional, and convincing: try to log in again with the same email and password and show
   that it fails.
9. Stop the recording. Attach the file under App Review Information, Attachment.

## Subscriptions

Both subscriptions already have a price, availability in every region and an English name and
description. Each still needs **Review Information**.

**Screenshot.** A picture of the subscription screen with that plan selected. Take it on the
iPhone once plans load. Until then, `Peptora/app-store/subscription-review-yearly.png` and
`subscription-review-monthly.png` show the same screen, rendered from the app's code in a
browser with the configured prices. Apple uses this image only for review. It is never shown in
the store.

**Review notes, yearly**

```
Peptora Pro unlocks saved protocols, press-and-hold logging and the log history, which are stored with the user's account. The peptide library and the reconstitution calculator stay free. To reach this purchase: sign in with the demo account from App Review Information, open the Protocols tab and tap "See plans" (or Profile > Subscribe), keep "Peptora Pro Yearly" selected and tap "Start 7-day free trial".
```

**Review notes, monthly**

```
Peptora Pro unlocks saved protocols, press-and-hold logging and the log history, which are stored with the user's account. The peptide library and the reconstitution calculator stay free. To reach this purchase: sign in with the demo account from App Review Information, open the Protocols tab and tap "See plans" (or Profile > Subscribe), select "Peptora Pro Monthly" and tap "Subscribe".
```

**Add them to the submission.** A first subscription is reviewed together with an app version.
Open Subscriptions, the Peptora Pro group, and choose **Add for Review** for the group and for
both subscriptions, putting them in the same draft submission as the app version. The version,
the group and both subscriptions all have to be in that one submission before you submit it.
If a subscription cannot be added, something on its page is still incomplete.

## App Privacy

The published label says Name and Email are used for Analytics. Peptora has no analytics, so
that is wrong in a way a reviewer can check. Set it to this:

| Data type | Collected | Linked to the user | Used for tracking | Purpose |
| --- | --- | --- | --- | --- |
| Contact Info: Email Address | Yes | Yes | No | App Functionality |
| Contact Info: Name | Yes | Yes | No | App Functionality |
| Health & Fitness: Health | Yes | Yes | No | App Functionality |
| User Content: Other User Content | Yes | Yes | No | App Functionality |
| Identifiers: User ID | Yes | Yes | No | App Functionality |
| Identifiers: Device ID | Yes | Yes | No | App Functionality |
| Purchases: Purchase History | Yes | Yes | No | App Functionality |

Why each one is there:

- **Health.** Protocols and log entries are what a user records about what they take. Apple's
  definition of Health covers "any other user provided health or medical data". Declaring it is
  the careful answer for a tracker in the Health & Fitness category.
- **Other User Content.** The free-text notes on a protocol and on a log entry.
- **User ID.** The account's id.
- **Device ID.** The hashed device fingerprint sent at sign-up, and the push notification token.
- **Purchase History.** The subscription record Apple sends to the API.

Nothing is used for tracking, and no data goes to advertisers, analytics or data brokers. The
privacy policy at `https://peptora.io/privacy-policy` says the same thing in words. Keep the two
in step.

## App Store Server Notifications

App Information, App Store Server Notifications. Set both URLs, Version 2, after the API is
deployed:

```
https://api.peptora.io/iap/apple/notifications
```

This is how a renewal, a cancellation or a refund reaches the API while the app is closed.

## If 1.4.2 comes back

Approved peptide trackers on the App Store ship the same kind of calculator, so this build keeps
it. But this app has been rejected under 1.4.2 twice, and a reviewer can still decide that any
units-to-draw arithmetic is a dosage calculator. If that happens, do not argue it. Ship the
tracker without the calculator:

1. In `src/lib/config.js` set `FEATURES.calculator` to `false`.
2. `npm run bump`, build, upload.

That removes the Calculator tab, the Calculation panel and the vial and syringe on a protocol,
the water volume comparison, and every sentence in the app that mentions the calculator. Nothing
in the build does arithmetic any more. It is a build-time switch on purpose: guideline 2.3.1
does not allow a feature that is switched on from a server after approval.

Then change the listing to match:

- Description: delete the "Reconstitution calculator" paragraph, and change "FREE, NO ACCOUNT
  NEEDED" so that it introduces the library only. Change "The library and the calculator are
  free." to "The library is free."
- Keywords: `peptides,tracker,vial,log,schedule,journal,reference,library,stack,protocol,reminder,history`
- Review notes, point 3 under GUIDELINE 1.4.2: `3. This build has no calculator. It performs no
  arithmetic of any kind and only records what the user enters.` In the 5.1.1(v) paragraph,
  "The Library and the Calculator work" becomes "The Library works".
- Subscription review notes: "The peptide library and the reconstitution calculator stay free"
  becomes "The peptide library stays free".
- Screenshots: remove the calculator one.

The calculator can come back in a later update, which Apple reviews on its own, with the
approved tracker still live in the store whatever the outcome.
