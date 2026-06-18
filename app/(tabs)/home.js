import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "../../src/lib/theme";
import { protocolsApi } from "../../src/api";
import { useAuthSession } from "../../src/lib/auth";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatCard({ value, label, icon, color }) {
  return (
    <View style={[s.statCard, { borderColor: color + "33" }]}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
      <Text style={[s.statNum, { color }]}>{value ?? "—"}</Text>
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
      <Text style={s.recentDate}>{formatDate(log.taken_at)}</Text>
    </View>
  );
}

function HomeContent() {
  const router = useRouter();
  const { user } = useAuthSession();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["protocols", "stats"],
    queryFn: () => protocolsApi.stats().then((r) => r.data),
    enabled: !!user,
  });

  const { data: protocols = [] } = useQuery({
    queryKey: ["protocols"],
    queryFn: () => protocolsApi.list().then((r) => r.data),
    enabled: !!user,
  });

  // Collect recent logs from loaded protocols (flat list, sorted by date)
  const recentLogs = protocols
    .flatMap((p) => (p.dose_logs || []).map((l) => ({ ...l, protocol_label: p.label })))
    .sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at))
    .slice(0, 5);

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
        <View>
          <Text style={s.greeting}>{greeting}{firstName ? `, ${firstName}` : ""}</Text>
          <Text style={s.greetingSub}>Here's your protocol overview</Text>
        </View>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{user?.email?.[0]?.toUpperCase() ?? "P"}</Text>
        </View>
      </View>

      {/* Stats */}
      {user && (
        <View style={s.statsRow}>
          {statsLoading ? (
            <ActivityIndicator color={colors.teal} style={{ flex: 1, paddingVertical: 20 }} />
          ) : (
            <>
              <StatCard value={stats?.active_protocols} label="Active" icon="play-circle" color={colors.teal} />
              <StatCard value={stats?.total_protocols} label="Total" icon="flask" color={colors.blue} />
              <StatCard value={stats?.logs_this_week} label="This Week" icon="trending-up" color={colors.yellow} />
            </>
          )}
        </View>
      )}

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <QuickAction
        icon="flask"
        label="Protocols"
        desc="View and manage your peptide protocols"
        accent={colors.teal}
        onPress={() => router.push("/(tabs)/protocols")}
      />
      <QuickAction
        icon="book"
        label="Encyclopedia"
        desc="Browse the peptide knowledge base"
        accent={colors.blue}
        onPress={() => router.push("/(tabs)/encyclopedia")}
      />

      {/* Recent Activity */}
      {user && recentLogs.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Recent Logs</Text>
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

      {/* Not logged in CTA */}
      {!user && (
        <View style={s.ctaCard}>
          <Ionicons name="flask-outline" size={36} color={colors.teal} style={{ marginBottom: 12 }} />
          <Text style={s.ctaTitle}>Track your peptide protocols</Text>
          <Text style={s.ctaSub}>
            Create an account to save protocols, log doses, and get AI-powered cycle summaries.
          </Text>
          <TouchableOpacity style={s.ctaBtn} onPress={() => router.push("/auth/signup")}>
            <Text style={s.ctaBtnText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/auth/login")}>
            <Text style={s.ctaLogin}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Disclaimer */}
      <Text style={s.disclaimer}>
        Peptora is for research and educational use only. Nothing here constitutes medical advice.
      </Text>
    </ScrollView>
  );
}

export default function HomeTab() {
  return <HomeContent />;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  greetingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  greeting: { color: colors.tx, fontSize: 22, fontWeight: "800" },
  greetingSub: { color: colors.tx2, fontSize: 13, marginTop: 2 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.teal, justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#021a0e", fontSize: 18, fontWeight: "700" },
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
  disclaimer: { color: colors.tx3, fontSize: 11, textAlign: "center", marginTop: 28, lineHeight: 16, fontStyle: "italic" },
});
