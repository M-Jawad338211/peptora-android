import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "../../src/lib/theme";
import { protocolsApi, trackerApi } from "../../src/api";
import { useAccess } from "../../src/lib/auth";
import { COPY, FEATURES } from "../../src/lib/config";
import { dateTime } from "../../src/lib/format";

function StatCard({ value, label, icon, color }) {
  return (
    <View style={[s.statCard, { borderColor: color + "33" }]}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
      <Text style={[s.statNum, { color }]}>{value ?? 0}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, desc, onPress, accent }) {
  return (
    <TouchableOpacity style={s.qaCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.qaIcon, { backgroundColor: accent + "18", borderColor: accent + "40" }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <View style={s.qaText}>
        <Text style={s.qaLabel}>{label}</Text>
        <Text style={s.qaDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.tx3} />
    </TouchableOpacity>
  );
}

function RecentLog({ log }) {
  return (
    <View style={s.recentEntry}>
      <View style={s.recentDot} />
      <View style={s.recentBody}>
        <Text style={s.recentPeptide}>{log.peptide_name}</Text>
        <Text style={s.recentDose}>{log.dose}</Text>
      </View>
      <Text style={s.recentDate}>{dateTime(log.taken_at)}</Text>
    </View>
  );
}

/** Where the account stands with Peptora Pro, and the way to the plans. */
function PlanCard({ access, onPress }) {
  if (!access) return null;
  if (access.is_lifetime || access.is_subscription) return null;

  let title;
  let text;
  if (access.is_trial) {
    const days = access.days_remaining;
    title = days === 0 ? "Account trial ends today" : `Account trial: ${days} day${days === 1 ? "" : "s"} left`;
    text = "Subscribe at any time to keep your protocols and your log.";
  } else if (!access.has_access) {
    title = "Peptora Pro";
    text = `Subscribe to save protocols, log entries and keep your history. ${COPY.freeStays}`;
  } else {
    return null;
  }

  return (
    <TouchableOpacity style={s.planCard} onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
      <Ionicons name="star-outline" size={20} color={colors.teal} />
      <View style={{ flex: 1 }}>
        <Text style={s.planTitle}>{title}</Text>
        <Text style={s.planText}>{text}</Text>
      </View>
      <Text style={s.planLink}>See plans</Text>
    </TouchableOpacity>
  );
}

export default function HomeTab() {
  const router = useRouter();
  const { user, access, hasAccess } = useAccess();
  const proReady = !!user && hasAccess;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["protocols", "stats"],
    queryFn: () => protocolsApi.stats().then((r) => r.data),
    enabled: proReady,
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["tracker", "logs"],
    queryFn: () => trackerApi.getLogs().then((r) => r.data),
    enabled: proReady,
    select: (logs) => logs.slice(0, 5),
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.full_name?.split(" ")[0] || null;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Greeting */}
      <View style={s.greetingRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>{greeting}{firstName ? `, ${firstName}` : ""}</Text>
          <Text style={s.greetingSub}>
            {user ? "Your protocols at a glance" : "Peptide tracking and reference"}
          </Text>
        </View>
        {user ? (
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user.email?.[0]?.toUpperCase() ?? "P"}</Text>
          </View>
        ) : null}
      </View>

      {user ? <PlanCard access={access} onPress={() => router.push("/paywall")} /> : null}

      {/* Stats */}
      {proReady && (
        <View style={s.statsRow}>
          {statsLoading ? (
            <ActivityIndicator color={colors.teal} style={{ flex: 1, paddingVertical: 20 }} />
          ) : (
            <>
              <StatCard value={stats?.active_protocols} label="Active" icon="play-circle" color={colors.teal} />
              <StatCard value={stats?.total_protocols} label="Total" icon="flask" color={colors.blue} />
              <StatCard value={stats?.logs_this_week} label="This week" icon="trending-up" color={colors.yellow} />
            </>
          )}
        </View>
      )}

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Go to</Text>
      <QuickAction
        icon="flask"
        label="Protocols"
        desc="Your vials, the schedule you set, and your log"
        accent={colors.teal}
        onPress={() => router.push("/(tabs)/protocols")}
      />
      <QuickAction
        icon="book"
        label="Library"
        desc="Reference entries with their sources"
        accent={colors.blue}
        onPress={() => router.push("/(tabs)/encyclopedia")}
      />
      {FEATURES.calculator && (
        <QuickAction
          icon="beaker"
          label="Calculator"
          desc="Reconstitution arithmetic on your own numbers"
          accent={colors.yellow}
          onPress={() => router.push("/(tabs)/calculator")}
        />
      )}

      {/* Recent activity */}
      {proReady && recentLogs.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Recent log entries</Text>
          <View style={s.recentCard}>
            {recentLogs.map((log) => (
              <RecentLog key={log.id} log={log} />
            ))}
            <TouchableOpacity
              style={s.viewAllBtn}
              onPress={() => router.push("/(tabs)/protocols")}
            >
              <Text style={s.viewAllText}>View all protocols</Text>
              <Ionicons name="arrow-forward" size={13} color={colors.teal} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Signed out */}
      {!user && (
        <View style={s.ctaCard}>
          <Ionicons name="flask-outline" size={36} color={colors.teal} style={{ marginBottom: 12 }} />
          <Text style={s.ctaTitle}>Track your protocols</Text>
          <Text style={s.ctaSub}>
            {COPY.freeNoAccount} Create one to save protocols, log entries
            and keep your history.
          </Text>
          <TouchableOpacity style={s.ctaBtn} onPress={() => router.push("/auth/signup")}>
            <Text style={s.ctaBtnText}>Create an account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/auth/login")}>
            <Text style={s.ctaLogin}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={s.disclaimer}>
        Peptora records the schedule you set. It does not recommend doses, it
        does not sell peptides or medication, and nothing here is medical
        advice.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  greetingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { color: colors.tx, fontSize: 22, fontWeight: "800" },
  greetingSub: { color: colors.tx2, fontSize: 13, marginTop: 2 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.teal, justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#021a0e", fontSize: 18, fontWeight: "700" },
  planCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(0,214,143,0.07)", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "rgba(0,214,143,0.30)", marginBottom: 20,
  },
  planTitle: { color: colors.tx, fontSize: 14, fontWeight: "700" },
  planText: { color: colors.tx2, fontSize: 12, lineHeight: 17, marginTop: 2 },
  planLink: { color: colors.teal, fontSize: 13, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    alignItems: "center", borderWidth: 1,
  },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { color: colors.tx2, fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginTop: 2 },
  sectionTitle: {
    color: colors.tx2, fontSize: 12, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
  },
  qaCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  qaIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  qaText: { flex: 1 },
  qaLabel: { color: colors.tx, fontSize: 16, fontWeight: "700" },
  qaDesc: { color: colors.tx2, fontSize: 12, marginTop: 2 },
  recentCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  recentEntry: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  recentDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal, marginRight: 12 },
  recentBody: { flex: 1 },
  recentPeptide: { color: colors.tx, fontSize: 14, fontWeight: "600" },
  recentDose: { color: colors.teal, fontSize: 12, marginTop: 1 },
  recentDate: { color: colors.tx3, fontSize: 11 },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 12, justifyContent: "center" },
  viewAllText: { color: colors.teal, fontSize: 13, fontWeight: "600" },
  ctaCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24,
    alignItems: "center", borderWidth: 1, borderColor: colors.border, marginTop: 8,
  },
  ctaTitle: { color: colors.tx, fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  ctaSub: { color: colors.tx2, fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 20 },
  ctaBtn: {
    backgroundColor: colors.teal, borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 14, marginBottom: 12, width: "100%", alignItems: "center",
  },
  ctaBtnText: { color: "#021a0e", fontSize: 15, fontWeight: "700" },
  ctaLogin: { color: colors.tx2, fontSize: 13 },
  disclaimer: { color: colors.tx3, fontSize: 12, textAlign: "center", marginTop: 28, lineHeight: 18 },
});
