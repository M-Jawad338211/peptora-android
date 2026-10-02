import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { requireOptionalNativeModule } from "expo";
import * as ExpoIap from "expo-iap";
import { iapApi } from "../api";
import { AUTH_SESSION_KEY, useAuthSession } from "./auth";
import { IAP_SKUS } from "./config";
import { logger } from "./logger";

/**
 * Apple In-App Purchase for Peptora Pro.
 *
 * One provider at the root of the app owns the StoreKit connection for the
 * whole session. That matters for two reasons: the purchase library's
 * connection is not reference counted, so a second hook mounting and
 * unmounting would tear the first one's connection down; and StoreKit delivers
 * renewals and interrupted purchases when the app launches, not when the
 * paywall happens to be open, so something has to be listening from the start.
 *
 * Nothing here decides whether the user has Pro. A purchase is only a signed
 * transaction that this module posts to the API; the API verifies Apple's
 * signature and answers with the account's access state, and the rest of the
 * app reads that from the session (see useAccess in ./auth).
 */

const TAG = "IAP";
const SKUS = [IAP_SKUS.yearly, IAP_SKUS.monthly];

// The native module exists only in an iOS build that was made after expo-iap
// was added. Asking for it this way returns null instead of throwing, so
// anything else (Android, the web preview, an older dev client) gets the
// "unavailable" state and a working app.
const NATIVE_AVAILABLE = Platform.OS === "ios" && !!requireOptionalNativeModule("ExpoIap");

const UNAVAILABLE = {
  available: false,
  connected: false,
  plans: [],
  plansStatus: "unavailable",
  purchasingSku: null,
  verifying: false,
  restoring: false,
  reloadPlans: async () => {},
  purchase: async () => ({ ok: false, reason: "unavailable" }),
  restore: async () => ({ ok: false, reason: "unavailable" }),
  manageSubscriptions: async () => {},
  subscribe: () => () => {},
};

const IapContext = createContext(UNAVAILABLE);

export function useIap() {
  return useContext(IapContext);
}

function isCancelled(error) {
  if (typeof ExpoIap.isUserCancelledError === "function") return ExpoIap.isUserCancelledError(error);
  return error?.code === "user-cancelled";
}

/** Whole days in a subscription period, or null for month and year lengths. */
function periodDays(period, count = 1) {
  if (!period || !period.value) return null;
  const n = period.value * (count || 1);
  if (period.unit === "day") return n;
  if (period.unit === "week") return n * 7;
  return null;
}

/**
 * The free trial attached to a product, read from what StoreKit reports
 * rather than assumed. Returns null when the product has no free trial, or
 * when its length cannot be read with certainty.
 */
function freeTrialOf(product) {
  const offers = product.subscriptionOffers ?? [];
  const intro = offers.find(
    (o) => o.type === "introductory" && o.paymentMode === "free-trial",
  );
  if (intro) {
    const days = periodDays(intro.period, intro.periodCount);
    if (days) return { days };
  }
  if (product.introductoryPricePaymentModeIOS === "free-trial") {
    const count = Number(product.introductoryPriceNumberOfPeriodsIOS) || 0;
    const unit = product.introductoryPriceSubscriptionPeriodIOS;
    if (count > 0 && unit === "day") return { days: count };
    if (count > 0 && unit === "week") return { days: count * 7 };
  }
  return null;
}

function toPlan(product) {
  const unit = product.subscriptionPeriodUnitIOS;
  return {
    id: product.id,
    title: product.displayName || product.title,
    description: product.description || "",
    // Already localised and formatted by the App Store for this storefront.
    displayPrice: product.displayPrice,
    period: unit === "year" ? "year" : unit === "month" ? "month" : unit || "",
    isYearly: product.id === IAP_SKUS.yearly,
    groupId: product.subscriptionGroupIdIOS ?? null,
    freeTrial: freeTrialOf(product),
  };
}

function IapBridge({ children }) {
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const userRef = useRef(user);
  userRef.current = user;

  const [plansStatus, setPlansStatus] = useState("idle"); // idle | loading | ready | empty | error
  const [trialEligible, setTrialEligible] = useState(null);
  const [purchasingSku, setPurchasingSku] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // The paywall listens for purchase outcomes through this, rather than the
  // provider owning any UI of its own.
  const listeners = useRef(new Set());
  const emit = useCallback((event) => {
    listeners.current.forEach((fn) => {
      try {
        fn(event);
      } catch (e) {
        logger.warn(TAG, "listener failed", e?.message);
      }
    });
  }, []);
  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  // Set once the purchase hook below exists; `deliver` is defined first
  // because the hook's own callbacks need it.
  const finishRef = useRef(null);

  /**
   * Post signed transactions to the API and apply the answer to the session.
   * Returns the API's reply. Throws if the request itself failed, in which
   * case nothing was finished and StoreKit will hand the transactions back.
   */
  const deliver = useCallback(
    async (purchases) => {
      const signed = purchases.filter((p) => p?.purchaseToken).slice(0, 10);
      if (signed.length === 0) return null;

      const res = await iapApi.verifyApple(signed.map((p) => p.purchaseToken));
      const { access, results = [] } = res.data ?? {};

      // Finish only what the server accepted as genuine. Anything it refused
      // stays in StoreKit's queue untouched.
      await Promise.all(
        signed.map(async (purchase, i) => {
          if (results[i]?.status === "invalid") return;
          try {
            await finishRef.current?.({ purchase, isConsumable: false });
          } catch (e) {
            logger.warn(TAG, "finishTransaction failed", e?.message);
          }
        }),
      );

      if (access) {
        queryClient.setQueryData(AUTH_SESSION_KEY, (prev) =>
          prev ? { ...prev, access, plan: access.has_access ? "pro" : "free" } : prev,
        );
        // Protocols, stats and history were refused while locked; let them load.
        queryClient.invalidateQueries({ queryKey: ["protocols"] });
        queryClient.invalidateQueries({ queryKey: ["calculator"] });
        queryClient.invalidateQueries({ queryKey: ["tracker"] });
      }
      return { access, results };
    },
    [queryClient],
  );

  const iap = ExpoIap.useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (!SKUS.includes(purchase?.productId)) return;
      if (!userRef.current) {
        // Nobody is signed in, so there is no account to attach this to yet.
        // It stays unfinished and is picked up by the sync after sign-in.
        emit({ type: "needs-account" });
        return;
      }
      setVerifying(true);
      try {
        const reply = await deliver([purchase]);
        const status = reply?.results?.[0]?.status;
        if (status === "invalid") {
          emit({ type: "error", message: "The App Store purchase could not be verified. You have not lost anything: tap Restore Purchases to try again." });
        } else if (reply?.access?.has_access) {
          emit({ type: "purchased", access: reply.access });
        } else {
          emit({ type: "error", message: "That subscription is no longer active." });
        }
      } catch (e) {
        logger.warn(TAG, "verify failed", e?.message);
        emit({
          type: "error",
          message: "Your purchase went through, but Peptora could not reach its server to unlock Pro. Check your connection and tap Restore Purchases.",
        });
      } finally {
        setVerifying(false);
        setPurchasingSku(null);
      }
    },
    onPurchaseError: (error) => {
      setPurchasingSku(null);
      if (isCancelled(error)) {
        emit({ type: "cancelled" });
        return;
      }
      if (error?.code === "deferred-payment" || error?.code === "pending") {
        emit({ type: "pending" });
        return;
      }
      emit({
        type: "error",
        message: ExpoIap.getUserFriendlyErrorMessage
          ? ExpoIap.getUserFriendlyErrorMessage(error)
          : "The purchase could not be completed. Please try again.",
      });
    },
    onError: (error) => {
      logger.warn(TAG, "store error", error?.message);
    },
  });

  const { connected, subscriptions, fetchProducts, requestPurchase, reconnect } = iap;
  finishRef.current = iap.finishTransaction;

  const loadPlans = useCallback(async () => {
    setPlansStatus("loading");
    try {
      await fetchProducts({ skus: SKUS, type: "subs" });
      setPlansStatus("ready");
    } catch (e) {
      logger.warn(TAG, "fetchProducts failed", e?.message);
      setPlansStatus("error");
    }
  }, [fetchProducts]);

  useEffect(() => {
    if (connected) loadPlans();
  }, [connected, loadPlans]);

  // The Retry button on the paywall. If the store connection itself never
  // came up, that has to be retried before the products can be asked for.
  const reloadPlans = useCallback(async () => {
    if (!connected) {
      setPlansStatus("loading");
      const ok = await reconnect();
      if (!ok) {
        setPlansStatus("error");
        return;
      }
    }
    await loadPlans();
  }, [connected, reconnect, loadPlans]);

  const plans = useMemo(() => {
    const known = (subscriptions ?? []).filter((p) => SKUS.includes(p.id)).map(toPlan);
    // Yearly first: it is the one with the free trial.
    known.sort((a, b) => Number(b.isYearly) - Number(a.isYearly));
    return known.map((plan) => ({
      ...plan,
      // Apple grants one introductory offer per subscription group, per
      // Apple ID. Never advertise a trial to someone who would not get it.
      freeTrial: trialEligible === false ? null : plan.freeTrial,
    }));
  }, [subscriptions, trialEligible]);

  const groupId = plans.find((p) => p.groupId)?.groupId ?? null;
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    ExpoIap.isEligibleForIntroOfferIOS(groupId)
      .then((ok) => {
        if (!cancelled) setTrialEligible(!!ok);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [groupId, user?.access?.is_subscription]);

  /**
   * Quietly bring the account up to date with what this Apple ID owns.
   * Runs once per signed-in account per launch. This is what picks up a
   * renewal that happened while the app was closed, and a purchase whose
   * confirmation never reached the server.
   */
  const syncedFor = useRef(null);
  useEffect(() => {
    if (!connected || !user?.id || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    (async () => {
      try {
        const owned = await ExpoIap.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
        const mine = (owned ?? []).filter((p) => SKUS.includes(p.productId));
        if (mine.length) await deliver(mine);
      } catch (e) {
        // Try again on the next launch or sign-in.
        syncedFor.current = null;
        logger.warn(TAG, "launch sync failed", e?.message);
      }
    })();
  }, [connected, user?.id, deliver]);

  const purchase = useCallback(
    async (sku) => {
      const current = userRef.current;
      if (!current) return { ok: false, reason: "needs-account" };
      if (!SKUS.includes(sku)) return { ok: false, reason: "unknown-product" };
      setPurchasingSku(sku);
      try {
        const result = await requestPurchase({
          // The account id travels with the purchase as StoreKit's
          // appAccountToken, so Apple's server notifications can be matched to
          // this account even if the app never gets to report the purchase.
          request: { apple: { sku, appAccountToken: current.id } },
          type: "subs",
        });
        const delivered = Array.isArray(result) ? result.length > 0 : !!result;
        if (!delivered) {
          // No transaction yet: the sheet was dismissed, or the purchase is
          // waiting on approval (Ask to Buy). Nothing more will arrive on
          // this call, so release the button.
          setPurchasingSku(null);
        }
        return { ok: true };
      } catch (e) {
        // The outcome is also reported through onPurchaseError above; this
        // only makes sure the button never stays stuck in its busy state.
        setPurchasingSku(null);
        if (!isCancelled(e)) logger.warn(TAG, "requestPurchase failed", e?.message);
        return { ok: false, reason: isCancelled(e) ? "cancelled" : "error" };
      }
    },
    [requestPurchase],
  );

  const restore = useCallback(async () => {
    if (!userRef.current) return { ok: false, reason: "needs-account" };
    setRestoring(true);
    try {
      // Asks the App Store for this Apple ID's purchases. iOS may prompt for
      // the Apple ID password, which is why this only runs on a button press.
      await ExpoIap.syncIOS();
      const owned = await ExpoIap.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      const mine = (owned ?? []).filter((p) => SKUS.includes(p.productId));
      if (mine.length === 0) return { ok: true, restored: false };
      const reply = await deliver(mine);
      return { ok: true, restored: !!reply?.access?.has_access };
    } catch (e) {
      if (isCancelled(e)) return { ok: false, reason: "cancelled" };
      logger.warn(TAG, "restore failed", e?.message);
      return { ok: false, reason: "error" };
    } finally {
      setRestoring(false);
    }
  }, [deliver]);

  const manageSubscriptions = useCallback(async () => {
    try {
      // Apple's own sheet, shown over the app. Cancelling, changing plan and
      // turning auto-renew off all happen there.
      await ExpoIap.showManageSubscriptionsIOS();
    } catch (e) {
      logger.warn(TAG, "manage sheet failed, opening the App Store", e?.message);
      try {
        await ExpoIap.deepLinkToSubscriptions();
      } catch {}
      return;
    }
    // The plan may have changed while the sheet was open.
    try {
      const owned = await ExpoIap.getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      const mine = (owned ?? []).filter((p) => SKUS.includes(p.productId));
      if (mine.length && userRef.current) await deliver(mine);
    } catch {}
  }, [deliver]);

  const value = useMemo(
    () => ({
      available: true,
      connected,
      plans,
      plansStatus: plansStatus === "ready" && plans.length === 0 ? "empty" : plansStatus,
      purchasingSku,
      verifying,
      restoring,
      reloadPlans,
      purchase,
      restore,
      manageSubscriptions,
      subscribe,
    }),
    [connected, plans, plansStatus, purchasingSku, verifying, restoring, reloadPlans, purchase, restore, manageSubscriptions, subscribe],
  );

  return <IapContext.Provider value={value}>{children}</IapContext.Provider>;
}

export function IapProvider({ children }) {
  if (!NATIVE_AVAILABLE) {
    return <IapContext.Provider value={UNAVAILABLE}>{children}</IapContext.Provider>;
  }
  return <IapBridge>{children}</IapBridge>;
}
