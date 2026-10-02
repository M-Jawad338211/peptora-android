// App-wide constants that are not secrets and do not vary by environment.

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

export const FEATURES = {
  // Everything that does reconstitution arithmetic: the Calculator tab, the
  // "Calculation" panel with the vial and syringe on a protocol, and the
  // water volume comparison. It works only on numbers the user types and
  // never suggests an amount.
  //
  // Set this to false to ship a build that records what the user enters and
  // does no arithmetic at all. Every one of those pieces disappears, and so
  // does every sentence that mentions the calculator (see COPY below). It is
  // a build-time switch on purpose: App Review does not allow a feature that
  // is turned on from a server after approval.
  calculator: false,

  // Dose figures from the library's sources: reported dose ranges, protocols
  // described in the literature, routes, and per-component amounts on a
  // stack. Off for the App Store: App Review rejected build 6 under guideline
  // 1.4.5 with them on screen. With this off the library describes what a
  // peptide is, its status, storage and research, and shows no amounts.
  doseFigures: false,
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
