import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { billingApi } from "../../src/api";
import { AuthGate, useAccess } from "../../src/lib/auth";
import { errorMessage, formatAmount, statusTone } from "../../src/lib/account";
import { LINKS } from "../../src/lib/config";
import { dateOnly } from "../../src/lib/format";
import { planSummary } from "../../src/lib/plan";
import { colors } from "../../src/lib/theme";
import ActionButton from "../../src/components/ActionButton";
import FormScreen, { Panel, SectionLabel, Title } from "../../src/components/FormScreen";
import Notice from "../../src/components/Notice";

const TONES = {
  good: { color: colors.teal, bg: "rgba(0,214,143,0.10)", border: "rgba(0,214,143,0.40)" },
  warn: { color: colors.yellow, bg: "rgba(255,211,42,0.08)", border: "rgba(255,211,42,0.35)" },
  bad: { color: colors.red, bg: "rgba(255,71,87,0.08)", border: "rgba(255,71,87,0.40)" },
  muted: { color: colors.tx3, bg: "rgba(255,255,255,0.04)", border: colors.border },
};

export default function BillingHistoryScreen() {
  return (
    <AuthGate title="Log in to see your billing history">
      {() => <BillingHistory />}
    </AuthGate>
  );
}

function BillingHistory() {
  const { access } = useAccess();
  const plan = planSummary(access);
  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ["account", "billing-history"],
    queryFn: () => billingApi.history().then((r) => r.data?.items ?? []),
    staleTime: 0,
    refetchOnMount: "always",
  });

  return (
    <FormScreen refreshing={isRefetching} onRefresh={refetch}>
      <Title>Billing history</Title>

      <Panel style={{ marginTop: 12 }}>
        <SectionLabel>Your plan</SectionLabel>
        <Text style={[s.planName, { color: plan.color }]}>{plan.label}</Text>
        {plan.detail ? <Text style={s.planDetail}>{plan.detail}</Text> : null}
        {Platform.OS !== "ios" ? (
          <ActionButton
            variant="secondary"
            icon="open-outline"
            label="Manage billing on the website"
            onPress={() => Linking.openURL(LINKS.webBilling).catch(() => {})}
            style={{ marginTop: 14 }}
          />
        ) : null}
      </Panel>

      <SectionLabel style={{ marginTop: 24 }}>Payments</SectionLabel>

      {isLoading && !data ? <ActivityIndicator color={colors.teal} style={s.loading} /> : null}
      {error && !data ? (
        <>
          <Notice kind="error">{errorMessage(error, "Your billing history could not be loaded.")}</Notice>
          <ActionButton variant="secondary" label="Try again" onPress={refetch} style={{ marginTop: 12 }} />
        </>
      ) : null}

      {data && data.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={30} color={colors.tx3} />
          <Text style={s.emptyTitle}>No payments yet</Text>
          <Text style={s.emptyText}>Payments for Peptora Pro appear here once you make one.</Text>
        </View>
      ) : null}

      {data?.map((item) => {
        const tone = TONES[statusTone(item.status)];
        const amount = formatAmount(item.amount, item.currency);
        const how = [amount, item.method].filter(Boolean).join(", ");
        return (
          <View key={item.id} style={s.card}>
            <View style={s.head}>
              <Text style={s.title}>{item.title}</Text>
              <View style={[s.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                <Text style={[s.pillText, { color: tone.color }]}>{item.status_label}</Text>
              </View>
            </View>
            {how ? <Text style={s.how}>{how}</Text> : null}
            {item.reference ? (
              <Text style={s.small} numberOfLines={1} ellipsizeMode="middle">Reference {item.reference}</Text>
            ) : null}
            {item.detail ? <Text style={s.detail}>{item.detail}</Text> : null}
            <Text style={s.small}>{dateOnly(item.date)}</Text>
          </View>
        );
      })}

    </FormScreen>
  );
}

const s = StyleSheet.create({
  loading: { marginTop: 24 },
  planName: { fontSize: 18, fontWeight: "800" },
  planDetail: { color: colors.tx2, fontSize: 13, marginTop: 4 },
  empty: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 24, alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { color: colors.tx, fontSize: 16, fontWeight: "700", marginTop: 6 },
  emptyText: { color: colors.tx2, fontSize: 14, lineHeight: 20, textAlign: "center" },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  title: { color: colors.tx, fontSize: 15, fontWeight: "700", flex: 1, minWidth: 0, lineHeight: 21 },
  pill: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  pillText: { fontSize: 11, fontWeight: "700" },
  how: { color: colors.tx, fontSize: 14, marginTop: 2 },
  small: { color: colors.tx3, fontSize: 12, lineHeight: 17 },
  detail: { color: colors.tx2, fontSize: 13, lineHeight: 19, marginTop: 2 },
});
