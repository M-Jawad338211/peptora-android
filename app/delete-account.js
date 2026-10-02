import { useState } from "react";
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { authApi } from "../src/api";
import { clearTokens } from "../src/api/client";
import { AuthPrompt, clearAllCaches, useAccess } from "../src/lib/auth";
import { useIap } from "../src/lib/iap";
import { closeModal } from "../src/lib/nav";
import { colors } from "../src/lib/theme";
import { FEATURES } from "../src/lib/config";
import HoldButton from "../src/components/HoldButton";

const REMOVED = [
  "Your profile, email address and login",
  "Every protocol you saved",
  "Every log entry and your history",
  ...(FEATURES.calculator ? ["Saved calculations"] : []),
];

/**
 * Permanent account deletion, start to finish, inside the app.
 *
 * Reached from Profile. The password is asked for again and the button has to
 * be held, so neither a stray tap nor an unlocked phone can erase an account.
 * When the server confirms, the session and every cached screen are wiped and
 * this screen shows the confirmation.
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, access, loading } = useAccess();
  const iap = useIap();

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null); // { subscriptionActive: boolean }

  const subscribed = !!access?.is_subscription;

  const remove = async () => {
    if (busy) return;
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.deleteAccount(password);
      // Show the confirmation first: signing out below empties the session,
      // and this screen must not fall back to its "log in" state in between.
      setDone({ subscriptionActive: !!res.data?.app_store_subscription_active });
      setPassword("");
      await clearTokens();
      clearAllCaches(queryClient);
    } catch (e) {
      const status = e.response?.status;
      const detail = e.response?.data?.detail;
      if (status === 403) setError("That password is not correct.");
      else if (status === 429) setError("Too many attempts. Wait a minute and try again.");
      else if (typeof detail === "string") setError(detail);
      else setError("Your account could not be deleted. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, s.centered]}>
        <View style={s.doneBadge}>
          <Ionicons name="checkmark" size={30} color={colors.teal} />
        </View>
        <Text style={[s.title, s.textCenter]}>Your account has been deleted</Text>
        <Text style={[s.body, s.textCenter]}>
          Your profile, protocols, log and history have been removed from
          Peptora. You are signed out on this device.
        </Text>
        {done.subscriptionActive ? (
          <View style={s.warnCard}>
            <Text style={s.warnTitle}>Your App Store subscription is still running</Text>
            <Text style={s.warnText}>
              Deleting an account does not cancel a subscription. Cancel it in
              your App Store subscriptions so that you are not charged again.
            </Text>
            <TouchableOpacity style={s.outlineBtn} onPress={iap.manageSubscriptions} activeOpacity={0.8}>
              <Text style={s.outlineBtnText}>Manage subscription</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <TouchableOpacity style={s.primary} onPress={() => closeModal(router)} activeOpacity={0.85}>
          <Text style={s.primaryText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (!loading && !user) {
    return <AuthPrompt title="Log in to delete your account" subtitle="You need to be signed in to the account you want to delete." />;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Delete your account</Text>
        <Text style={s.body}>
          This permanently deletes your Peptora account{user?.email ? ` (${user.email})` : ""} and
          everything stored with it. It cannot be undone, and a deleted
          account cannot be restored.
        </Text>

        <View style={s.card}>
          <Text style={s.cardTitle}>What is deleted</Text>
          {REMOVED.map((item) => (
            <View key={item} style={s.row}>
              <Ionicons name="close-circle" size={16} color={colors.red} />
              <Text style={s.rowText}>{item}</Text>
            </View>
          ))}
        </View>

        {subscribed ? (
          <View style={s.warnCard}>
            <Text style={s.warnTitle}>You have an active App Store subscription</Text>
            <Text style={s.warnText}>
              Deleting your account does not cancel it. Cancel the
              subscription first, or Apple will keep billing you for it.
            </Text>
            <TouchableOpacity style={s.outlineBtn} onPress={iap.manageSubscriptions} activeOpacity={0.8}>
              <Text style={s.outlineBtnText}>Manage subscription</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={(v) => { setPassword(v); setError(null); }}
          placeholder="Enter your password to confirm"
          placeholderTextColor={colors.tx3}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          accessibilityLabel="Password"
        />
        {error ? <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text> : null}

        <HoldButton
          style={{ marginTop: 18 }}
          tone="danger"
          icon="trash-outline"
          label="Hold to delete my account"
          holdingLabel="Keep holding to delete"
          doneLabel="Deleting"
          duration={1600}
          busy={busy}
          disabled={!password}
          onComplete={remove}
        />
        <Text style={s.hint}>Press and hold the button until the bar fills.</Text>

        <TouchableOpacity onPress={() => closeModal(router)}>
          <Text style={s.cancel}>Keep my account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flexGrow: 1, justifyContent: "center" },
  textCenter: { textAlign: "center" },
  doneBadge: {
    width: 64, height: 64, borderRadius: 32, alignSelf: "center",
    alignItems: "center", justifyContent: "center", marginBottom: 18,
    backgroundColor: "rgba(0,214,143,0.10)", borderWidth: 1, borderColor: "rgba(0,214,143,0.4)",
  },
  title: { color: colors.tx, fontSize: 24, fontWeight: "800", marginBottom: 10 },
  body: { color: colors.tx2, fontSize: 15, lineHeight: 22, marginBottom: 18 },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16, gap: 10,
  },
  cardTitle: {
    color: colors.tx2, fontSize: 12, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText: { color: colors.tx, fontSize: 14, flex: 1 },
  warnCard: {
    backgroundColor: "rgba(255,211,42,0.07)", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "rgba(255,211,42,0.30)", marginBottom: 16,
  },
  warnTitle: { color: colors.yellow, fontSize: 14, fontWeight: "700", marginBottom: 6 },
  warnText: { color: colors.tx, fontSize: 14, lineHeight: 20 },
  outlineBtn: {
    marginTop: 12, borderRadius: 12, padding: 12, alignItems: "center",
    borderWidth: 1, borderColor: colors.yellow,
  },
  outlineBtnText: { color: colors.yellow, fontSize: 14, fontWeight: "700" },
  label: { color: colors.tx2, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 14, color: colors.tx,
    fontSize: 15, borderWidth: 1, borderColor: colors.border,
  },
  error: { color: colors.red, fontSize: 13, marginTop: 8 },
  hint: { color: colors.tx3, fontSize: 12, textAlign: "center", marginTop: 8 },
  cancel: { color: colors.teal, fontSize: 15, fontWeight: "600", textAlign: "center", marginTop: 24, padding: 6 },
  primary: {
    backgroundColor: colors.teal, borderRadius: 12, padding: 15, alignItems: "center", marginTop: 8,
  },
  primaryText: { color: "#021a0e", fontSize: 16, fontWeight: "700" },
});
