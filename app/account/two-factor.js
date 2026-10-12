import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { authApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";
import { errorMessage } from "../../src/lib/account";
import { dateOnly } from "../../src/lib/format";
import { colors } from "../../src/lib/theme";
import ActionButton from "../../src/components/ActionButton";
import FormScreen, { Body, Panel, Title } from "../../src/components/FormScreen";
import Notice from "../../src/components/Notice";

export default function TwoFactorScreen() {
  return (
    <AuthGate title="Log in to manage two-factor authentication">
      {() => <TwoFactor />}
    </AuthGate>
  );
}

function TwoFactor() {
  const router = useRouter();
  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ["account", "2fa"],
    queryFn: () => authApi.twoFactorStatus().then((r) => r.data),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const remaining = data?.recovery_codes_remaining ?? 0;

  return (
    <FormScreen refreshing={isRefetching} onRefresh={refetch}>
      <Title>Two-factor authentication</Title>
      <Body>
        Adds a second step when you log in: a 6-digit code from an authenticator app such as Google
        Authenticator, Microsoft Authenticator, Authy or 1Password.
      </Body>

      {isLoading && !data ? <ActivityIndicator color={colors.teal} style={s.loading} /> : null}
      {error && !data ? (
        <>
          <Notice kind="error">{errorMessage(error, "The status could not be loaded.")}</Notice>
          <ActionButton variant="secondary" label="Try again" onPress={refetch} style={{ marginTop: 12 }} />
        </>
      ) : null}

      {data?.enabled ? (
        <>
          <Panel>
            <View style={s.statusRow}>
              <Ionicons name="shield-checkmark" size={24} color={colors.teal} />
              <View style={s.statusText}>
                <Text style={s.statusTitle}>Two-factor authentication is on</Text>
                {data.enabled_at ? <Text style={s.statusSub}>On since {dateOnly(data.enabled_at)}</Text> : null}
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.countRow}>
              <Text style={s.countLabel}>Recovery codes left</Text>
              <Text style={[s.countValue, remaining <= 2 && { color: colors.yellow }]}>{remaining}</Text>
            </View>
          </Panel>
          {remaining <= 2 ? (
            <Notice kind="warning">
              {remaining === 0
                ? "You have no recovery codes left. Get new ones so you can still log in if you lose your authenticator app."
                : `You have ${remaining} recovery code${remaining === 1 ? "" : "s"} left. Get new ones before they run out.`}
            </Notice>
          ) : null}
          <View style={s.actions}>
            <ActionButton
              variant="secondary"
              icon="key-outline"
              label="Get new recovery codes"
              onPress={() => router.push("/account/recovery-codes")}
            />
            <ActionButton
              variant="danger"
              icon="close-circle-outline"
              label="Turn off two-factor authentication"
              onPress={() => router.push("/account/two-factor-off")}
            />
          </View>
        </>
      ) : null}

      {data && !data.enabled ? (
        <>
          <Panel>
            <View style={s.statusRow}>
              <Ionicons name="shield-outline" size={24} color={colors.tx3} />
              <View style={s.statusText}>
                <Text style={s.statusTitle}>Two-factor authentication is off</Text>
                <Text style={s.statusSub}>Your account is protected by your password alone.</Text>
              </View>
            </View>
          </Panel>
          {data.setup_pending ? (
            <Notice kind="info">
              A setup was started and not finished. Starting again replaces it, so remove the earlier Peptora
              entry from your authenticator app first.
            </Notice>
          ) : null}
          <View style={s.actions}>
            <ActionButton label="Turn on" onPress={() => router.push("/account/two-factor-setup")} />
          </View>
        </>
      ) : null}
    </FormScreen>
  );
}

const s = StyleSheet.create({
  loading: { marginTop: 32 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusText: { flex: 1, minWidth: 0 },
  statusTitle: { color: colors.tx, fontSize: 15, fontWeight: "700" },
  statusSub: { color: colors.tx2, fontSize: 13, lineHeight: 18, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  countLabel: { color: colors.tx, fontSize: 14, flex: 1 },
  countValue: { color: colors.teal, fontSize: 20, fontWeight: "800" },
  actions: { gap: 10, marginTop: 20 },
});
