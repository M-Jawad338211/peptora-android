// App-wide constants that are not secrets and do not vary by environment.
import { Platform } from "react-native";

export const LINKS = {
  // Apple's standard licence agreement. App Store Connect is set to use it,
  // and the subscription screen must link to the same document.
  terms: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
  privacy: "https://peptora.io/privacy-policy",
  support: "https://peptora.io/support",
  // Opens the subscriptions list in the App Store app.
  manageSubscriptions: "https://apps.apple.com/account/subscriptions",
  // Android only. The iOS app sells Peptora Pro through In-App Purchase and
  // never sends anyone to the web to pay.
  webBilling: "https://peptora.io/app/billing",
};

// Auto-renewable subscriptions, created in App Store Connect under the
// "Peptora Pro" subscription group. The yearly plan carries a 7-day free
// introductory trial. The API accepts exactly these two identifiers.
export const IAP_SKUS = {
  yearly: "app.peptora.pro.yearly",
  monthly: "app.peptora.pro.monthly",
};

// Both switches below are "off on iOS, on everywhere else". They were turned
// off for Apple's App Review, and the app now ships on Google Play (and as a
// web build), where the same rule does not apply. Platform.OS is fixed when the
// bundle is built, so these stay build-time switches: nothing is turned on
// from a server after approval, which App Review does not allow.
export const FEATURES = {
  // Everything that does reconstitution arithmetic: the Calculator tab, the
  // "Calculation" panel with the vial and syringe on a protocol, and the
  // water volume comparison. It works only on numbers the user types and
  // never suggests an amount.
  //
  // Off on iOS because App Review rejected builds that had it on (guideline
  // 1.4.2, see "If 1.4.2 comes back" in APP_STORE_SUBMISSION.md). On
  // everywhere else. When it is off, every one of those pieces disappears, and
  // so does every sentence that mentions the calculator (see COPY below).
  calculator: Platform.OS !== "ios",

  // Dose figures from the library's sources: reported dose ranges, protocols
  // described in the literature, routes, and per-component amounts on a
  // stack. Off on iOS because App Review rejected build 6 under guideline
  // 1.4.5 with them on screen. On everywhere else. With this off the library
  // describes what a peptide is, its status, storage and research, and shows
  // no amounts.
  doseFigures: Platform.OS !== "ios",
};

// Sentences whose wording depends on whether the calculator ships.
export const COPY = FEATURES.calculator
  ? {
      freeStays: "The library and the calculator stay free.",
      freeNoAccount: "The library and the calculator work without an account.",
      freeTier: "Library and calculator",
      rangesNotCopied:
        "What the cited sources report. Peptora does not recommend a dose, and these figures are never copied into the calculator or a protocol.",
    }
  : {
      freeStays: "The library stays free.",
      freeNoAccount: "The library works without an account.",
      freeTier: "Library",
      rangesNotCopied:
        "What the cited sources report. Peptora does not recommend a dose, and these figures are never copied into a protocol.",
    };
