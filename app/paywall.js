import { useEffect, useState } from "react";
import {
  ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../src/lib/theme";
import { useAccess } from "../src/lib/auth";
import { COPY, IAP_SKUS, LINKS } from "../src/lib/config";
import { dateOnly } from "../src/lib/format";
import { success } from "../src/lib/haptics";
import { useIap } from "../src/lib/iap";
import { closeModal } from "../src/lib/nav";

const FEATURES = [
  "Save protocols for each vial you track",
  "Log an entry with one press and hold",
  "Your log, history and weekly totals",
  "Kept with your account, on every device you sign in to",
];

const PRODUCT_NAMES = {
  [IAP_SKUS.yearly]: "Peptora Pro Yearly",
  [IAP_SKUS.monthly]: "Peptora Pro Monthly",
};

function open(url) {
  Linking.openURL(url).catch(() => {});
}

function PlanOption({ plan, selected, onSelect }) {
  const per = plan.period === "year" ? "per year" : "per month";
  return (
    <TouchableOpacity
      style={[s.plan, selected && s.planSelected]}
      onPress={onSelect}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${plan.title}, ${plan.displayPrice} ${per}`}
    >
      <View style={[s.radio, selected && s.radioOn]}>
        {selected ? <View style={s.radioDot} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.planName}>{plan.title}</Text>
        <Text style={s.planPrice}>
          {plan.freeTrial ? `${plan.freeTrial.days} days free, then ` : ""}
          {plan.displayPrice} {per}
        </Text>
      </View>
      {plan.freeTrial ? (
        <View style={s.trialBadge}>
          <Text style={s.trialBadgeText}>{plan.freeTrial.days}-day free trial</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function Legal({ onRestore, restoring, showRestore }) {
  return (
    <View style={s.legal}>
      <View style={s.legalLinks}>
        {showRestore ? (
          <TouchableOpacity onPress={onRestore} disabled={restoring} accessibilityRole="button">
            {restoring
              ? <ActivityIndicator size="small" color={colors.teal} />
              : <Text style={s.legalLink}>Restore Purchases</Text>}
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => open(LINKS.terms)} accessibilityRole="link">
          <Text style={s.legalLink}>Terms of Use</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => open(LINKS.privacy)} accessibilityRole="link">
          <Text style={s.legalLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const { user, access, refresh } = useAccess();
  const iap = useIap();
  const [selected, setSelected] = useState(IAP_SKUS.yearly);
  const [message, setMessage] = useState(null); // { kind: "error" | "info" | "success", text }

  const close = () => closeModal(router);

  // Purchase outcomes arrive from the App Store connection that lives at the
  // root of the app, so they are handled here rather than awaited inline.
  useEffect(
    () =>
      iap.subscribe((event) => {
        if (event.type === "purchased") {
          success();
          setMessage({ kind: "success", text: "Peptora Pro is active. Thank you." });
        } else if (event.type === "error") {
          setMessage({ kind: "error", text: event.message });
        } else if (event.type === "pending") {
          setMessage({
            kind: "info",
            text: "This purchase is waiting for approval. Pro unlocks as soon as it is approved.",
          });
        } else if (event.type === "cancelled") {
          setMessage(null);
        }
      }),
    [iap],
  );

  // If the plan picked by default is not on offer, fall back to the first one.
  useEffect(() => {
    if (iap.plans.length && !iap.plans.some((p) => p.id === selected)) {
      setSelected(iap.plans[0].id);
    }
  }, [iap.plans, selected]);

  const busy = !!iap.purchasingSku || iap.verifying;
  const plan = iap.plans.find((p) => p.id === selected) ?? null;

  const subscribeNow = async () => {
    setMessage(null);
    if (!user) {
      router.push("/auth/signup");
      return;
    }
    const result = await iap.purchase(selected);
    if (!result.ok && result.reason === "needs-account") router.push("/auth/signup");
  };

  const restore = async () => {
    setMessage(null);
    if (!user) {
      setMessage({ kind: "info", text: "Log in first, then restore, so the subscription is attached to your account." });
      return;
    }
    const result = await iap.restore();
    await refresh();
    if (result.ok && result.restored) {
      success();
      setMessage({ kind: "success", text: "Your subscription has been restored." });
    } else if (result.ok) {
      setMessage({ kind: "info", text: "No active Peptora Pro subscription was found for this Apple ID." });
    } else if (result.reason !== "cancelled") {
      setMessage({ kind: "error", text: "Could not restore. Check your connection and try again." });
    }
  };

  const owned = access?.is_lifetime || access?.is_subscription;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.badge}>
        <Ionicons name="star" size={26} color={colors.teal} />
      </View>
      <Text style={s.title}>Peptora Pro</Text>
      <Text style={s.sub}>
        Track every vial and keep your log. {COPY.freeStays}
      </Text>

      <View style={s.features}>
        {FEATURES.map((f) => (
          <View key={f} style={s.featureRow}>
            <Ionicons name="checkmark-circle" size={17} color={colors.teal} />
            <Text style={s.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {message ? (
        <View
          style={[
            s.message,
            message.kind === "error" && s.messageError,
            message.kind === "success" && s.messageSuccess,
          ]}
          accessibilityLiveRegion="polite"
        >
          <Text style={s.messageText}>{message.text}</Text>
        </View>
      ) : null}

      {owned ? (
        <View style={s.ownedCard}>
          <Text style={s.ownedTitle}>You have Peptora Pro</Text>
          {access.is_lifetime ? (
            <Text style={s.ownedText}>This account has lifetime access. There is nothing to buy or renew.</Text>
          ) : (
            <>
              <Text style={s.ownedText}>
                {PRODUCT_NAMES[access.subscription_product] ?? "Peptora Pro subscription"}
                {access.subscription_is_trial ? " (free trial)" : ""}
              </Text>
              {access.subscription_expires_at ? (
                <Text style={s.ownedText}>
                  {access.subscription_auto_renew === false ? "Ends on " : "Renews on "}
                  {dateOnly(access.subscription_expires_at)}
                </Text>
              ) : null}
              {iap.available ? (
                <TouchableOpacity style={s.outlineBtn} onPress={iap.manageSubscriptions} activeOpacity={0.8}>
                  <Text style={s.outlineBtnText}>Manage subscription</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[s.ownedText, { marginTop: 8 }]}>
                  Manage or cancel it in your App Store account settings on your iPhone.
                </Text>
              )}
            </>
          )}
        </View>
      ) : !iap.available ? (
        <View style={s.ownedCard}>
          <Text style={s.ownedTitle}>Subscriptions are sold in the iPhone app</Text>
          <Text style={s.ownedText}>
            {Platform.OS === "android"
              ? "On Android, plans are managed on the Peptora website."
              : "In-app purchase is not available in this build."}
          </Text>
          {Platform.OS === "android" ? (
            <TouchableOpacity style={s.outlineBtn} onPress={() => open(LINKS.webBilling)} activeOpacity={0.8}>
              <Text style={s.outlineBtnText}>Open the website</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : iap.plans.length > 0 ? (
        <>
          {access?.is_trial ? (
            <Text style={s.trialNote}>
              Your account trial of Pro is still running
              {access.days_remaining != null ? `, with ${access.days_remaining} day${access.days_remaining === 1 ? "" : "s"} left` : ""}.
              You can subscribe now or when it ends.
            </Text>
          ) : null}

          <View accessibilityRole="radiogroup">
            {iap.plans.map((p) => (
              <PlanOption key={p.id} plan={p} selected={p.id === selected} onSelect={() => setSelected(p.id)} />
            ))}
          </View>

          <TouchableOpacity
            style={[s.cta, busy && s.ctaBusy]}
            onPress={subscribeNow}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#021a0e" />
            ) : (
              <Text style={s.ctaText}>
                {!user
                  ? "Create an account to subscribe"
                  : plan?.freeTrial
                    ? `Start ${plan.freeTrial.days}-day free trial`
                    : "Subscribe"}
              </Text>
            )}
          </TouchableOpacity>
          {!user ? (
            <Text style={s.finePrint}>
              Pro keeps your protocols and your log with your account, so you
              need an account before you subscribe.
            </Text>
          ) : null}

          <Text style={s.finePrint}>
            {plan?.freeTrial
              ? `Free for ${plan.freeTrial.days} days, then ${plan.displayPrice} per ${plan.period}. `
              : plan
                ? `${plan.displayPrice} per ${plan.period}. `
                : ""}
            Payment is charged to your Apple ID when you confirm. The
            subscription renews automatically at the same price and period
            unless you cancel at least 24 hours before the current period
            ends. Manage or cancel it at any time in your App Store account
            settings.
          </Text>
        </>
      ) : iap.plansStatus === "error" || iap.plansStatus === "empty" ? (
        <View style={s.ownedCard}>
          <Text style={s.ownedTitle}>Plans could not be loaded</Text>
          <Text style={s.ownedText}>
            The App Store did not return the subscription plans. Check your
            connection and try again.
          </Text>
          <TouchableOpacity style={s.outlineBtn} onPress={iap.reloadPlans} activeOpacity={0.8}>
            <Text style={s.outlineBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.loading}>
          <ActivityIndicator color={colors.teal} />
          <Text style={s.loadingText}>Loading plans from the App Store</Text>
        </View>
      )}

      <Legal onRestore={restore} restoring={iap.restoring} showRestore={iap.available} />

      <TouchableOpacity onPress={close} accessibilityRole="button">
        <Text style={s.close}>{owned || message?.kind === "success" ? "Done" : "Not now"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 24, paddingBottom: 48 },
  badge: {
    width: 56, height: 56, borderRadius: 28, alignSelf: "center",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,214,143,0.10)", borderWidth: 1, borderColor: "rgba(0,214,143,0.35)",
    marginBottom: 14,
  },
  title: { color: colors.tx, fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  sub: { color: colors.tx2, fontSize: 15, textAlign: "center", marginBottom: 22, lineHeight: 22 },
  features: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 18,
    borderWidth: 1, borderColor: colors.border, gap: 11,
  },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featureText: { color: colors.tx, fontSize: 14, flex: 1, lineHeight: 20 },
  message: {
    borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1,
    borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.04)",
  },
  messageError: { borderColor: "rgba(255,71,87,0.45)", backgroundColor: "rgba(255,71,87,0.08)" },
  messageSuccess: { borderColor: "rgba(0,214,143,0.45)", backgroundColor: "rgba(0,214,143,0.08)" },
  messageText: { color: colors.tx, fontSize: 14, lineHeight: 20 },
  trialNote: { color: colors.tx2, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  plan: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  planSelected: { borderColor: colors.teal, backgroundColor: "rgba(0,214,143,0.06)" },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.tx3,
    alignItems: "center", justifyContent: "center",
  },
  radioOn: { borderColor: colors.teal },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.teal },
  planName: { color: colors.tx, fontSize: 16, fontWeight: "700" },
  planPrice: { color: colors.tx2, fontSize: 14, marginTop: 3 },
  trialBadge: {
    backgroundColor: colors.teal, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  trialBadgeText: { color: "#021a0e", fontSize: 11, fontWeight: "700" },
  cta: {
    backgroundColor: colors.teal, borderRadius: 14, padding: 16,
    alignItems: "center", marginTop: 8, minHeight: 54, justifyContent: "center",
  },
  ctaBusy: { opacity: 0.7 },
  ctaText: { color: "#021a0e", fontSize: 16, fontWeight: "700" },
  finePrint: { color: colors.tx3, fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: "center" },
  ownedCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: colors.border,
  },
  ownedTitle: { color: colors.tx, fontSize: 16, fontWeight: "700", marginBottom: 6 },
  ownedText: { color: colors.tx2, fontSize: 14, lineHeight: 20 },
  outlineBtn: {
    marginTop: 14, borderRadius: 12, padding: 13, alignItems: "center",
    borderWidth: 1, borderColor: colors.teal,
  },
  outlineBtnText: { color: colors.teal, fontSize: 15, fontWeight: "700" },
  loading: { alignItems: "center", paddingVertical: 28, gap: 10 },
  loadingText: { color: colors.tx2, fontSize: 13 },
  legal: { marginTop: 22 },
  legalLinks: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 18 },
  legalLink: { color: colors.teal, fontSize: 13, fontWeight: "600" },
  close: { color: colors.tx3, fontSize: 14, textAlign: "center", marginTop: 22, padding: 6 },
});
