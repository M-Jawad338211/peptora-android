import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "../../src/lib/theme";
import { authApi, protocolsApi } from "../../src/api";
import { clearTokens } from "../../src/api/client";
import { useAccess, clearAllCaches } from "../../src/lib/auth";
import { COPY, IAP_SKUS, LINKS } from "../../src/lib/config";
import { dateOnly } from "../../src/lib/format";
import { useIap } from "../../src/lib/iap";

function SkeletonBlock({ width, height, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: 8, backgroundColor: colors.surface },
        { opacity },
        style,
      ]}
    />
  );
}

function ProfileSkeleton() {
  return (
    <View style={s.container}>
      <View style={{ padding: 20 }}>
        <View style={s.profileCard}>
          <SkeletonBlock width={52} height={52} style={{ borderRadius: 26 }} />
          <View style={{ gap: 8, flex: 1 }}>
            <SkeletonBlock width="60%" height={14} />
            <SkeletonBlock width="40%" height={12} />
          </View>
        </View>
        <SkeletonBlock width="100%" height={48} style={{ borderRadius: 12, marginTop: 8 }} />
      </View>
    </View>
  );
}

function open(url) {
  Linking.openURL(url).catch(() => {});
}

function Row({ icon, label, value, valueColor, onPress, last, busy, destructive }) {
  const content = (
    <View style={[s.settingsRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={17} color={destructive ? colors.red : colors.tx2} />
      <Text style={[s.settingsText, destructive && { color: colors.red }]}>{label}</Text>
      {busy ? (
        <ActivityIndicator size="small" color={colors.teal} />
      ) : value ? (
        <Text style={[s.settingsValue, valueColor && { color: valueColor }]} numberOfLines={1}>{value}</Text>
      ) : null}
      {onPress && !busy ? <Ionicons name="chevron-forward" size={15} color={colors.tx3} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} disabled={busy} activeOpacity={0.7} accessibilityRole="button">
      {content}
    </TouchableOpacity>
  );
}

/** One line that says what the account has, in plain words. */
function planSummary(access) {
  if (!access) return { label: "Free", detail: null, color: colors.tx3 };
  if (access.is_revoked) return { label: "Pro turned off", detail: null, color: colors.red };
  if (access.is_lifetime) return { label: "Pro, lifetime", detail: "Nothing to renew", color: colors.teal };
  if (access.is_subscription) {
    const yearly = access.subscription_product === IAP_SKUS.yearly;
    const monthly = access.subscription_product === IAP_SKUS.monthly;
    const name = yearly ? "Pro, yearly" : monthly ? "Pro, monthly" : "Pro";
    const when = access.subscription_expires_at ? dateOnly(access.subscription_expires_at) : null;
    const detail = when
      ? `${access.subscription_auto_renew === false ? "Ends" : "Renews"} ${when}`
      : null;
    return { label: access.subscription_is_trial ? `${name} (free trial)` : name, detail, color: colors.teal };
  }
  if (access.is_trial) {
    const d = access.days_remaining;
    return {
      label: "Pro, account trial",
      detail: d == null ? null : d === 0 ? "Ends today" : `${d} day${d === 1 ? "" : "s"} left`,
      color: colors.teal,
    };
  }
  if (access.has_access) return { label: "Pro", detail: null, color: colors.teal };
  return { label: "Free", detail: COPY.freeTier, color: colors.tx3 };
}

function Legal() {
  const version = Constants.expoConfig?.version;
  return (
    <>
      <Text style={s.sectionLabel}>About</Text>
      <View style={s.settingsCard}>
        <Row icon="document-text-outline" label="Terms of Use" onPress={() => open(LINKS.terms)} />
        <Row icon="lock-closed-outline" label="Privacy Policy" onPress={() => open(LINKS.privacy)} />
        <Row icon="help-circle-outline" label="Support" onPress={() => open(LINKS.support)} last={!version} />
        {version ? <Row icon="information-circle-outline" label="Version" value={version} last /> : null}
      </View>

      <View style={s.disclaimerCard}>
        <Text style={s.disclaimerText}>
          Peptora is a tracking and reference tool. It records the schedule
          you set and does not recommend doses. Nothing in this app is medical
          advice, diagnosis or treatment. Talk to a qualified clinician about
          your own protocol.
        </Text>
      </View>
    </>
  );
}

export default function ProfileTab() {
  const { user, loading, access, hasAccess, refresh } = useAccess();
  const router = useRouter();
  const queryClient = useQueryClient();
  const iap = useIap();
  const [restoring, setRestoring] = useState(false);

  const logout = async () => {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await authApi.logout().catch(() => {});
          await clearTokens();
          clearAllCaches(queryClient);
        },
      },
    ]);
  };

  const restore = async () => {
    setRestoring(true);
    try {
      const result = await iap.restore();
      await refresh();
      if (result.reason === "cancelled") return;
      Alert.alert(
        result.ok ? (result.restored ? "Restored" : "Nothing to restore") : "Could not restore",
        result.ok
          ? result.restored
            ? "Your Peptora Pro subscription is active on this account."
            : "No active Peptora Pro subscription was found for this Apple ID."
          : "Check your connection and try again.",
      );
    } finally {
      setRestoring(false);
    }
  };

  const { data: stats } = useQuery({
    queryKey: ["protocols", "stats"],
    queryFn: () => protocolsApi.stats().then((r) => r.data),
    enabled: !!user && hasAccess,
  });

  if (loading) return <ProfileSkeleton />;

  if (!user) {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={s.signedOut}>
          <Ionicons name="person-circle-outline" size={48} color={colors.teal} />
          <Text style={s.signedOutTitle}>You are not signed in</Text>
          <Text style={s.signedOutText}>
            {COPY.freeNoAccount} Sign in to save protocols and keep your log.
          </Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.push("/auth/login")} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.outlineBtn} onPress={() => router.push("/auth/signup")} activeOpacity={0.85}>
            <Text style={s.outlineBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLabel}>Peptora Pro</Text>
        <View style={s.settingsCard}>
          <Row icon="star-outline" label="See plans" onPress={() => router.push("/paywall")} last />
        </View>

        <Legal />
      </ScrollView>
    );
  }

  const plan = planSummary(access);
  const owned = !!access?.is_lifetime || !!access?.is_subscription;

  const proRows = [
    { icon: "star-outline", label: plan.label, value: plan.detail, valueColor: plan.color },
    !owned && !access?.is_revoked && {
      icon: "pricetag-outline",
      label: access?.is_trial ? "See plans and subscribe" : "Subscribe",
      onPress: () => router.push("/paywall"),
    },
    access?.is_subscription && iap.available && {
      icon: "card-outline", label: "Manage subscription", onPress: iap.manageSubscriptions,
    },
    access?.is_subscription && !iap.available && {
      icon: "card-outline", label: "Managed in your App Store account",
    },
    iap.available && {
      icon: "refresh-outline", label: "Restore Purchases", onPress: restore, busy: restoring,
    },
  ].filter(Boolean);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Profile card */}
      <View style={s.profileCard}>
        <Text style={s.avatar}>{user.email[0].toUpperCase()}</Text>
        <View style={{ flex: 1 }}>
          {user.full_name ? <Text style={s.name}>{user.full_name}</Text> : null}
          <Text style={s.email}>{user.email}</Text>
          <View style={s.planBadge}>
            <Text style={[s.planText, { color: plan.color }]}>{plan.label}</Text>
          </View>
        </View>
      </View>

      {/* Stats summary */}
      {stats && (
        <View style={s.statsRow}>
          {[
            { label: "Protocols", value: stats.total_protocols },
            { label: "Active", value: stats.active_protocols },
            { label: "Log entries", value: stats.total_logs },
          ].map(({ label, value }, i, all) => (
            <View key={label} style={[s.statCell, i === all.length - 1 && { borderRightWidth: 0 }]}>
              <Text style={s.statNum}>{value ?? 0}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.sectionLabel}>Peptora Pro</Text>
      <View style={s.settingsCard}>
        {proRows.map((row, i) => (
          <Row key={row.label} {...row} last={i === proRows.length - 1} />
        ))}
      </View>

      <Text style={s.sectionLabel}>Account</Text>
      <View style={s.settingsCard}>
        <Row icon="mail-outline" label={user.email} />
        <Row
          icon="shield-checkmark-outline"
          label="Email verified"
          value={user.email_verified ? "Yes" : "No"}
          valueColor={colors.teal}
        />
        <Row icon="log-out-outline" label="Log out" onPress={logout} />
        <Row
          icon="trash-outline"
          label="Delete account"
          onPress={() => router.push("/delete-account")}
          destructive
          last
        />
      </View>

      <Legal />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.teal,
    textAlign: "center",
    lineHeight: 52,
    fontSize: 22,
    fontWeight: "700",
    color: "#021a0e",
    overflow: "hidden",
  },
  email: { color: colors.tx2, fontSize: 13, marginTop: 2 },
  name: { color: colors.tx, fontSize: 16, fontWeight: "700" },
  planBadge: { marginTop: 6 },
  planText: { fontSize: 12, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    overflow: "hidden",
  },
  statCell: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  statNum: { color: colors.teal, fontSize: 20, fontWeight: "800" },
  statLabel: { color: colors.tx2, fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginTop: 2 },
  sectionLabel: {
    color: colors.tx2,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsText: { color: colors.tx, fontSize: 14, flex: 1 },
  settingsValue: { color: colors.tx2, fontSize: 13, fontWeight: "600", maxWidth: "50%" },
  disclaimerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  disclaimerText: { color: colors.tx3, fontSize: 12, lineHeight: 18 },
  signedOut: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: "center",
    borderWidth: 1, borderColor: colors.border, marginBottom: 20,
  },
  signedOutTitle: { color: colors.tx, fontSize: 19, fontWeight: "700", marginTop: 10, marginBottom: 6 },
  signedOutText: { color: colors.tx2, fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 18 },
  primaryBtn: {
    backgroundColor: colors.teal, borderRadius: 12, padding: 15, alignItems: "center", width: "100%", marginBottom: 10,
  },
  primaryBtnText: { color: "#021a0e", fontSize: 16, fontWeight: "700" },
  outlineBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 15, alignItems: "center", width: "100%",
  },
  outlineBtnText: { color: colors.tx, fontSize: 16 },
});
