# Building and releasing Peptora

How to run the app on simulators and ship builds to Google Play and the App Store, all from this Mac.
Everything runs from the `peptora-android/` folder.

- Expo SDK 57 · React Native 0.86.3
- Bundle ID / package: `app.peptora`
- EAS project: `@jawads-organization/peptora-native`
- Builds run and are signed on this Mac (`eas build --local` with local signing keys), and uploads go
  from this Mac straight to Apple and Google (`xcrun altool` / `fastlane`).

---

## After every change

### 1. Try it on the simulators

```bash
npm run ios        # builds and opens the app on the iOS Simulator
npm run android    # builds and opens the app on the Android Emulator
```

- Start the Android emulator first: Android Studio → Device Manager → ▶ on `Pixel_8`
  (or `emulator -avd Pixel_8 &`).
- The first run of each takes 5–10 minutes. After that, just run `npm start` and press
  `i` (iOS) or `a` (Android). JavaScript changes reload instantly.
- Re-run `npm run ios` / `npm run android` only when you add or upgrade a package with
  native code, or change `app.json` (plugins, permissions, icons, splash).
  After an `app.json` change, run `npm run prebuild:clean` first.

**Using the local API** (`peptora-api` on port 8000): create `.env` with
`EXPO_PUBLIC_API_URL=http://localhost:8000`. For Android, also run
`adb reverse tcp:8000 tcp:8000` after each emulator start, because `localhost` inside
the emulator is the emulator itself. Restart Metro with `npx expo start --dev-client --clear`
after editing `.env`.

### 2. Check

```bash
npm test && npm run doctor
```

Both must pass before building.

### 3. Bump the build numbers

```bash
npm run bump              # Android versionCode +1, iOS buildNumber +1
npm run bump -- 1.3.0     # same, and also sets the app version to 1.3.0
```

Both stores reject a build number they've already received. Change the version
(`1.3.0`) for any user-facing release and for every native change.

Commit before building, so each store build matches a commit.

### 4. Build

```bash
npm run build:android     # signed .aab for Google Play   (~12 min)
npm run build:ios         # signed .ipa for the App Store (~15 min)
```

Output goes to `build-artifacts/`. Run one at a time if the Mac is busy with other work.

### 5. Submit

```bash
npm run submit:android    # uploads the newest .aab from this Mac with fastlane
npm run submit:ios        # uploads the newest .ipa from this Mac with Apple's altool
```

These need the two upload keys in `~/.peptora/` (one-time setup, see
[Uploading from this Mac](#uploading-from-this-mac)). If a key is ever missing or broken,
`npm run submit:android:eas` / `npm run submit:ios:eas` upload the same file through Expo's
servers instead. That route can sit in a queue for a while.

- **Android** arrives on the Play Console **internal testing** track as a draft.
  Roll it out, test it, then promote it to Production.
- **iOS** appears in **TestFlight** after 10–30 minutes of processing. In App Store Connect,
  add it to a new version, fill in "What's New", and choose **Add for Review**.

That's the whole loop: **bump → build → submit**.

### 6. Release to production

**Google Play** (play.google.com/console → Peptora → *Test and release*):
1. *Testing → Internal testing*: the upload is a **draft** release. Open it, add release notes,
   choose **Next → Save and publish**. Internal testers get it within minutes.
2. Test it on a real phone (install through the internal testing opt-in link).
3. Choose **Promote release → Production** (or *Production → Create new release → Add from library*
   and pick the versionCode). Add release notes, choose a staged rollout percentage (for example 20%),
   then **Next → Save**.
4. *Publishing overview* → **Send changes for review**. Google usually reviews within a few hours to
   3 days.
5. After approval, raise the rollout to 100% from *Production → Releases*.

**App Store** (appstoreconnect.apple.com → Apps → Peptora):
1. *TestFlight*: the build appears after processing (usually 10–30 min). Internal testers can install
   it right away. External testers need a one-time Beta App Review per version.
2. *Distribution*: open the editable iOS version (or choose **+** to create one), set **Version** to
   match `app.json`, and fill in "What's New" (not shown on a first release).
3. *Build* section → **Add Build** → pick the build you uploaded.
4. Check *App Review Information*. Peptora needs a login, so give Apple a working **demo account**.
5. Choose **Manually release this version** or **Automatically release**, then
   **Add for Review → Submit to App Review**. Review usually takes 1–2 days.
6. After approval, choose **Release This Version** (if manual). It reaches the store within about 24 hours.

**Version codes:** Play and App Store Connect keep every build number ever uploaded, including drafts
and builds that were never released. If an upload says the number is already used, run `npm run bump`
and rebuild.

---

## Signing keys (stored on this Mac)

Store builds are signed with files in `~/.peptora/signing/`, outside the repo.
`eas.json` sets `"credentialsSource": "local"` for the `production` and `preview` profiles,
so builds never download keys from Expo. `eas build --local` still talks to Expo for your login,
the project ID and environment settings, but no signing keys are downloaded.

| File in `~/.peptora/signing/` | What it is |
| --- | --- |
| `credentials.json` | Paths and passwords for the three files below. The project's `credentials.json` is a link to this file (git-ignored). |
| `android-upload.jks` | Android upload keystore. Alias `c73f9f34ca541b9f317100d4be588149`, SHA-1 `D2:1D:66:8E:68:27:FB:3F:9D:2A:2C:56:5B:12:11:54:4D:FD:BC:63` |
| `ios-dist-cert.p12` | `iPhone Distribution: Jawad Ahmad (RPZQ9KM7WN)`, **expires 22 May 2027** |
| `ios-appstore.mobileprovision` | App Store profile for `RPZQ9KM7WN.app.peptora`, **expires 22 May 2027** |

Other IDs:

| What | Value |
| --- | --- |
| App Store Connect app ID | `6772127291`, set in `eas.json` → `submit.production.ios.ascAppId` |
| Apple team | `RPZQ9KM7WN` (Jawad Ahmad, Individual) |
| Google Play package | `app.peptora` |

**Back up `~/.peptora/` (the whole folder).** Save it in your password manager or an encrypted
drive. Copies of the signing keys also stay on EAS (`eas credentials`) as a second backup. Don't
delete them there. If you lose the Android keystore, Play updates need an upload-key reset through Google.

**Setting up another Mac:** copy `~/.peptora/` across, then run
`ln -s ~/.peptora/signing/credentials.json credentials.json` in the project folder.

**Renewing iOS signing (before 22 May 2027):**
1. `eas credentials -p ios` → production → create a new distribution certificate and profile
   (this needs your Apple login).
2. Same menu → *credentials.json: Upload/Download* → *Download credentials from EAS to credentials.json*.
3. Move the new files into `~/.peptora/signing/` with the same names as above, and remove the
   `credentials/` folder and the new `credentials.json` from the project.
4. Restore the link: `ln -sf ~/.peptora/signing/credentials.json credentials.json`.
   The passwords may have changed, so copy them from the downloaded `credentials.json` into the one in
   `~/.peptora/signing/`.

To go back to Expo-managed signing at any time, delete the `"credentialsSource": "local"` lines
from `eas.json`.

### Uploading from this Mac

EAS keeps its copies of the store API keys and won't let you download them, so this Mac has its own
pair. They live in `~/.peptora/`, outside the repo, so they can never be committed.

| File | What it is |
| --- | --- |
| `~/.peptora/AuthKey_<KEYID>.p8` | App Store Connect API key (currently `AuthKey_2CL4WDG24M.p8`, created 30 Sep 2026). The key ID is read from the file name. Issuer ID `d8e2727b-2171-4d09-970d-5f7290b26131` is built in. |
| `~/.peptora/play-service-account.json` | Google Play service account key for `peptora-service-account@peptora-495719.iam.gserviceaccount.com` |

**Create the App Store Connect key (once):**
1. App Store Connect → **Users and Access → Integrations → App Store Connect API → Team Keys → +**.
2. Name it `Peptora Mac upload`, access **App Manager**, then choose **Generate**.
3. Choose **Download API Key**. Apple lets you download it only once.
4. Move it into place: `mv ~/Downloads/AuthKey_*.p8 ~/.peptora/ && chmod 600 ~/.peptora/AuthKey_*.p8`

**Create the Google Play key (once):**
1. Google Cloud Console → project **peptora-495719** → **IAM & Admin → Service Accounts**.
2. Open `peptora-service-account@…` → **Keys → Add key → Create new key → JSON**.
   The account already has Play Console access, because EAS uses it.
3. Move it into place: `mv ~/Downloads/peptora-495719-*.json ~/.peptora/play-service-account.json && chmod 600 ~/.peptora/play-service-account.json`

Back up both files in your password manager. If one leaks, revoke it in the same screen and create a new one.

---

## One-time setup of this Mac (done 30 Sep 2026)

For reference, or for setting up another Mac.

| Tool | Version / location |
| --- | --- |
| Xcode | 26.6 (SDK 57 needs 26.4+) |
| Node.js | 24.10 (needs 20.19.4+) |
| Java | Azul Zulu 17, `/Library/Java/JavaVirtualMachines/zulu-17.jdk` |
| Android SDK | `~/Library/Android/sdk`: platform 36, Build-Tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1, cmdline-tools |
| Android emulator | AVD `Pixel_8` |
| CocoaPods, fastlane, Watchman | Homebrew |
| EAS CLI | global (`npm i -g eas-cli@latest`), logged in with `eas login` |
| Apple WWDR G3 intermediate certificate | login keychain (see below) |

`~/.zshrc` contains:

```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/27.1.12297006
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH
```

**Apple intermediate certificate.** iOS signing only works if macOS can verify the distribution
certificate. That needs Apple's "Worldwide Developer Relations – G3" intermediate certificate:

```bash
curl -fsSL -o ~/Downloads/AppleWWDRCAG3.cer https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer
security import ~/Downloads/AppleWWDRCAG3.cer -k ~/Library/Keychains/login.keychain-db
```

---

## Troubleshooting

| Error | Fix |
| --- | --- |
| iOS: `Distribution certificate ... hasn't been imported successfully` | The Apple WWDR G3 intermediate certificate is missing. Run the two commands above, then build again. |
| iOS build asks to log in to Apple, or fails with `Authentication with Apple Developer Portal failed` | Not needed, because credentials come from EAS. Use `npm run build:ios` (it passes `--non-interactive`). If you run `eas build` by hand, answer **no** to the Apple login question. |
| `credentials.json does not exist in the project root directory` | The link is missing: `ln -s ~/.peptora/signing/credentials.json credentials.json` |
| `No App Store Connect key found` / `No Google Play key found` | Create the key and put it in `~/.peptora/` (see *Uploading from this Mac*). |
| altool: `The bundle version must be higher` or `redundant binary upload` | That build number is already in App Store Connect (for example, an EAS submit already sent it). `npm run bump`, then rebuild. |
| fastlane: `The caller does not have permission` | The service account lost Play Console access. Play Console → Users and permissions → re-invite it with release rights. |
| `submit:ios:eas` asks to log in to Apple / `Authentication with Apple Developer Portal failed` | `ascAppId` is missing from the `submit.production.ios` block in `eas.json`. It must be `6772127291`. |
| `CocoaPods requires your terminal to be using UTF-8` | Open a new terminal tab (the `LANG` lines in `~/.zshrc` weren't loaded). |
| `Unable to locate a Java Runtime` / `SDK location not found` / `adb: command not found` | Open a new terminal tab, or `source ~/.zshrc`. Check `echo $JAVA_HOME $ANDROID_HOME`. |
| `"ios.buildNumber" must be a string` | In `app.json` it must be quoted, e.g. `"buildNumber": "6"`. `npm run bump` does this for you. |
| Play: `Version code N has already been used` | `npm run bump`, then rebuild. |
| App Store: `bundle version must be higher` | `npm run bump`, then rebuild. |
| Android app can't reach the local API | `adb reverse tcp:8000 tcp:8000` and check `curl http://localhost:8000/health`. |
| `Port 8081 is being used` | `lsof -ti :8081 \| xargs kill`, then `npm start`. |
| Stale or weird native errors after changing packages or `app.json` | `npm run prebuild:clean`, then `npm run ios` / `npm run android`. |
| Pod install / Xcode `No such module` | `rm -rf ios ~/Library/Developer/Xcode/DerivedData`, then `npm run ios`. |
| Gradle cache errors | `rm -rf android`, then `npm run android`. As a last resort, `rm -rf ~/.gradle/caches`. |
| Need to inspect a failed store build | Prefix the command with `EAS_LOCAL_BUILD_SKIP_CLEANUP=1`; the log prints the build folder. Logs are also in `build-artifacts/*.log` when run by hand with `> build-artifacts/x.log 2>&1`. |
| `expo-doctor` reports version mismatches | `npx expo install --fix` |

**Full reset:** `rm -rf node_modules android ios .expo && npm install && npm run prebuild:clean`.
The `android/` and `ios/` folders are generated and git-ignored, so deleting them is safe.

---

## Known gaps

- **No over-the-air updates.** `expo-updates` isn't installed, so every change needs a store build.
  To enable it later: `npx expo install expo-updates`, `eas update:configure`, add a
  `channel` to the build profiles in `eas.json`, and rebuild.
- **Android push notifications need Firebase.** No `google-services.json` is configured, so Android
  devices can't register for push notifications yet. iOS is unaffected.
  Simulators never receive push notifications.
- **Icons are 512×512.** Replace `assets/icon.png` (no transparency) and
  `assets/adaptive-icon.png` with 1024×1024 versions for sharper store icons.
- **API domain mismatch.** `.env.example` uses `api.peptora.app`, while the production build uses
  `api.peptora.io`. Confirm which one is correct.

## Files involved

- `eas.json`: build profiles (development / preview / production) and submit settings
- `app.json`: version, build numbers, icons, plugins
- `scripts/bump-build.js`: `npm run bump`
- `scripts/submit-latest.js`: `npm run submit:android` / `npm run submit:ios`
- `build-artifacts/`: built `.aab` / `.ipa` files (git-ignored)
