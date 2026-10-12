import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";
import { errorMessage, formatWhen, platformLabel } from "../../src/lib/account";
import { colors } from "../../src/lib/theme";
import ActionButton from "../../src/components/ActionButton";
import FormScreen, { Body, Title } from "../../src/components/FormScreen";
import Notice from "../../src/components/Notice";

export default function ActivityScreen() {
  return (
    <AuthGate title="Log in to see your activity">
      {() => <Activity />}
    </AuthGate>
  );
}

function Activity() {
  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ["account", "activity"],
    queryFn: () => authApi.activity(20).then((r) => r.data?.items ?? []),
    staleTime: 0,
    refetchOnMount: "always",
  });

  return (
    <FormScreen refreshing={isRefetching} onRefresh={refetch}>
      <Title>Recent activity</Title>
      <Body>
        The last 20 security events on your account. If you see one you do not know, change your password
        and sign out of your other devices.
      </Body>

      {isLoading && !data ? <ActivityIndicator color={colors.teal} style={s.loading} /> : null}
      {error && !data ? (
        <>
          <Notice kind="error">{errorMessage(error, "Your activity could not be loaded.")}</Notice>
          <ActionButton variant="secondary" label="Try again" onPress={refetch} style={{ marginTop: 12 }} />
        </>
      ) : null}

      {data && data.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No activity yet</Text>
          <Text style={s.emptyText}>Security events such as logins and password changes appear here.</Text>
        </View>
      ) : null}

      {data && data.length > 0 ? (
        <View style={s.card}>
          {data.map((item, index) => (
            <View key={item.id} style={[s.row, index === data.length - 1 && s.rowLast]}>
              <View style={s.dot} />
              <View style={s.body}>
                <Text style={s.label}>{item.label}</Text>
                <View style={s.meta}>
                  {item.platform ? (
                    <View style={s.chip}>
                      <Text style={s.chipText}>{platformLabel(item.platform)}</Text>
                    </View>
                  ) : null}
                  <Text style={s.time}>{formatWhen(item.created_at)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </FormScreen>
  );
}

const s = StyleSheet.create({
  loading: { marginTop: 32 },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: colors.border, marginTop: 20,
  },
  row: {
    flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal, marginTop: 6 },
  body: { flex: 1, minWidth: 0 },
  label: { color: colors.tx, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 },
  chip: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  chipText: { color: colors.tx3, fontSize: 11 },
  time: { color: colors.tx3, fontSize: 12 },
  empty: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 24, alignItems: "center",
    borderWidth: 1, borderColor: colors.border, marginTop: 20,
  },
  emptyTitle: { color: colors.tx, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptyText: { color: colors.tx2, fontSize: 14, lineHeight: 20, textAlign: "center" },
});
