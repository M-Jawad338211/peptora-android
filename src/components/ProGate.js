import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";
import { COPY } from "../lib/config";
import { AuthPrompt, useAccess } from "../lib/auth";
import { useIap } from "../lib/iap";

/**
 * Wraps the parts of the app that belong to Peptora Pro: saved protocols, the
 * log and history.
 *
 * Three outcomes. Signed out: the usual log-in prompt. Signed in without
 * access: an explanation and a way to subscribe or restore. Signed in with
 * access: the children.
 *
 * The decision comes from the server (`user.access.has_access`). This
 * component never works it out from dates.
 */
export default function ProGate({ children, authTitle, authSubtitle }) {
  const router = useRouter();
  const { user, loading, hasAccess, access, refresh } = useAccess();
  const iap = useIap();
  const [restoring, setRestoring] = useState(false);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (!user) return <AuthPrompt title={authTitle} subtitle={authSubtitle} />;
  if (hasAccess) return typeof children === "function" ? children(user) : children;

  const revoked = !!access?.is_revoked;
  const trialUsed = !!access?.trial_ends_at;

  const restore = async () => {
    setRestoring(true);
    try {
      const result = await iap.restore();
      await refresh();
      if (result.ok && result.restored) return;
      if (result.reason === "cancelled") return;
      Alert.alert(
        result.ok ? "Nothing to restore" : "Could not restore",
        result.ok
          ? "No active Peptora Pro subscription was found for this Apple ID."
          : "Check your connection and try again.",
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.badge}>
        <Ionicons name="lock-closed" size={26} color={colors.teal} />
      </View>
      <Text style={s.title}>Peptora Pro</Text>
      <Text style={s.body}>
        {revoked
          ? "Pro has been turned off for this account. Contact support if you think that is a mistake."
          : trialUsed
            ? "Your account trial has ended. Subscribe to keep your protocols, your log and your history."
            : "Saved protocols, logging and history are part of Peptora Pro."}
      </Text>
      <Text style={s.free}>{COPY.freeStays}</Text>

      {!revoked && (
        <TouchableOpacity style={s.primary} onPress={() => router.push("/paywall")} activeOpacity={0.85}>
          <Text style={s.primaryText}>See plans</Text>
        </TouchableOpacity>
      )}

      {iap.available && !revoked && (
        <TouchableOpacity style={s.secondary} onPress={restore} disabled={restoring} activeOpacity={0.7}>
          {restoring
            ? <ActivityIndicator color={colors.teal} size="small" />
            : <Text style={s.secondaryText}>Restore Purchases</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  content: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.navy },
  badge: {
    width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,214,143,0.10)", borderWidth: 1, borderColor: "rgba(0,214,143,0.35)",
    marginBottom: 16,
  },
  title: { color: colors.tx, fontSize: 24, fontWeight: "800", marginBottom: 10 },
  body: { color: colors.tx2, fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 8 },
  free: { color: colors.tx3, fontSize: 13, textAlign: "center", marginBottom: 24 },
  primary: {
    backgroundColor: colors.teal, borderRadius: 12, padding: 15,
    alignItems: "center", width: "100%", marginBottom: 10,
  },
  primaryText: { color: "#021a0e", fontSize: 16, fontWeight: "700" },
  secondary: { padding: 14, alignItems: "center", width: "100%" },
  secondaryText: { color: colors.teal, fontSize: 15, fontWeight: "600" },
});
