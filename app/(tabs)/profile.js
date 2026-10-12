import { useEffect, useRef, useState } from "react";
import {
  Alert, Animated, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "../../src/lib/theme";
import { authApi, protocolsApi } from "../../src/api";
import { clearTokens } from "../../src/api/client";
import { useAccess, clearAllCaches } from "../../src/lib/auth";
import { COPY, LINKS } from "../../src/lib/config";
import { dateOnly } from "../../src/lib/format";
import { useIap } from "../../src/lib/iap";
import { initialOf } from "../../src/lib/account";
import { useAvatarUri } from "../../src/lib/accountSession";
import { planSummary } from "../../src/lib/plan";
import Avatar from "../../src/components/Avatar";
import { SettingsRow as Row } from "../../src/components/SettingsRow";

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

  // The photo, or null (then the initial letter is shown). Called before the
  // early returns below, as every hook must be.
  const avatarUri = useAvatarUri(user);

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
    {
      icon: "receipt-outline", label: "Billing history", onPress: () => router.push("/account/billing-history"),
    },
  ].filter(Boolean);

  const twoFactorKnown = typeof user.two_factor_enabled === "boolean";

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Profile card */}
      <View style={s.profileCard}>
        <Avatar uri={avatarUri} initial={initialOf(user.email)} size={52} />
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

      <Text style={s.sectionLabel}>Account settings</Text>
      <View style={s.settingsCard}>
        <Row
          icon="person-outline"
          label="Profile"
          detail={[user.full_name, user.phone].filter(Boolean).join(", ") || "Add a photo, name and phone number"}
          onPress={() => router.push("/account/edit-profile")}
        />
        <Row
          icon="mail-outline"
          label="Email address"
          detail={user.pending_email ? `Waiting for confirmation of ${user.pending_email}` : user.email}
          onPress={() => router.push("/account/change-email")}
        />
        <Row
          icon="key-outline"
          label="Password"
          detail={user.password_changed_at ? `Last changed ${dateOnly(user.password_changed_at)}` : "Change your password"}
          onPress={() => router.push("/account/change-password")}
          last
        />
      </View>

      <Text style={s.sectionLabel}>Security</Text>
      <View style={s.settingsCard}>
        <Row
          icon="shield-checkmark-outline"
          label="Two-factor authentication"
          value={twoFactorKnown ? (user.two_factor_enabled ? "On" : "Off") : undefined}
          valueColor={user.two_factor_enabled ? colors.teal : colors.tx3}
          onPress={() => router.push("/account/two-factor")}
        />
        <Row
          icon="phone-portrait-outline"
          label="Sign out of other devices"
          onPress={() => router.push("/account/devices")}
        />
        <Row
          icon="time-outline"
          label="Recent activity"
          onPress={() => router.push("/account/activity")}
          last
        />
      </View>

      <Text style={s.sectionLabel}>Account</Text>
      <View style={s.settingsCard}>
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
