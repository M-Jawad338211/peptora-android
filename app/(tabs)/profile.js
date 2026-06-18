import { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/lib/theme";
import { authApi, protocolsApi } from "../../src/api";
import { clearTokens } from "../../src/api/client";
import { useAuthSession, AuthPrompt, clearAllCaches } from "../../src/lib/auth";
import { useRouter } from "expo-router";

function SkeletonBlock({ width, height, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

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
        {/* Profile card skeleton */}
        <View style={s.profileCard}>
          <SkeletonBlock width={52} height={52} style={{ borderRadius: 26 }} />
          <View style={{ gap: 8, flex: 1 }}>
            <SkeletonBlock width="60%" height={14} />
            <SkeletonBlock width="40%" height={12} />
          </View>
        </View>
        {/* Logout button skeleton */}
        <SkeletonBlock width="100%" height={48} style={{ borderRadius: 12, marginTop: 8 }} />
      </View>
    </View>
  );
}

export default function ProfileTab() {
  const { user, loading } = useAuthSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const logout = async () => {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await authApi.logout().catch(() => {});
          await clearTokens();
          clearAllCaches(queryClient);
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const { data: stats } = useQuery({
    queryKey: ["protocols", "stats"],
    queryFn: () => protocolsApi.stats().then((r) => r.data),
    enabled: !!user,
  });

  if (loading) return <ProfileSkeleton />;
  if (!user) return <AuthPrompt title="Log in to view your profile" />;

  const planLabel = user.plan === "pro" ? "Pro" : "Free";
  const planColor = user.plan === "pro" ? colors.teal : colors.tx3;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Profile card */}
      <View style={s.profileCard}>
        <Text style={s.avatar}>{user.email[0].toUpperCase()}</Text>
        <View style={{ flex: 1 }}>
          {user.full_name ? <Text style={s.name}>{user.full_name}</Text> : null}
          <Text style={s.email}>{user.email}</Text>
          <View style={s.planBadge}>
            <Text style={[s.planText, { color: planColor }]}>{planLabel} Plan</Text>
          </View>
        </View>
      </View>

      {/* Stats summary */}
      {stats && (
        <View style={s.statsRow}>
          {[
            { label: "Protocols", value: stats.total_protocols },
            { label: "Active", value: stats.active_protocols },
            { label: "Total Logs", value: stats.total_logs },
          ].map(({ label, value }) => (
            <View key={label} style={s.statCell}>
              <Text style={s.statNum}>{value ?? 0}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Settings sections */}
      <Text style={s.sectionLabel}>Account</Text>
      <View style={s.settingsCard}>
        <View style={s.settingsRow}>
          <Ionicons name="mail-outline" size={17} color={colors.tx2} />
          <Text style={s.settingsText}>{user.email}</Text>
        </View>
        <View style={[s.settingsRow, { borderBottomWidth: 0 }]}>
          <Ionicons name="shield-checkmark-outline" size={17} color={colors.tx2} />
          <Text style={s.settingsText}>Email verified</Text>
          <Text style={[s.settingsValue, { color: colors.teal }]}>
            {user.email_verified ? "Yes" : "No"}
          </Text>
        </View>
      </View>

      <Text style={s.sectionLabel}>Plan</Text>
      <View style={s.settingsCard}>
        <View style={[s.settingsRow, { borderBottomWidth: 0 }]}>
          <Ionicons name="star-outline" size={17} color={planColor} />
          <Text style={s.settingsText}>Current plan</Text>
          <Text style={[s.settingsValue, { color: planColor }]}>{planLabel}</Text>
        </View>
      </View>

      <Text style={s.sectionLabel}>Disclaimer</Text>
      <View style={s.disclaimerCard}>
        <Text style={s.disclaimerText}>
          Peptora is for research and educational use only. Nothing in this app constitutes medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional before making any health-related decisions.
        </Text>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={17} color={colors.red} />
        <Text style={s.logoutText}>Log Out</Text>
      </TouchableOpacity>
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
  settingsValue: { color: colors.tx2, fontSize: 14, fontWeight: "600" },
  disclaimerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  disclaimerText: { color: colors.tx3, fontSize: 12, lineHeight: 18, fontStyle: "italic" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,71,87,0.3)",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  logoutText: { color: colors.red, fontSize: 15, fontWeight: "600" },
});
