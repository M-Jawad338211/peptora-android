import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../src/api";
import { clearTokens } from "../src/api/client";
import { colors } from "../src/lib/theme";
import { COPY, FEATURES, LINKS } from "../src/lib/config";
import { invalidateAuthSession, clearAllCaches } from "../src/lib/auth";

export default function ConsentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await authApi.acceptConsent();
      await invalidateAuthSession(queryClient);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Could not save your consent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline terms",
      `An account needs these terms accepted. Declining signs you out. ${COPY.freeNoAccount}`,
      [
        { text: "Go Back", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await authApi.logout().catch(() => {});
            await clearTokens();
            clearAllCaches(queryClient);
            router.replace("/(tabs)");
          },
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}>Peptora</Text>
        <Text style={s.title}>Terms of Use</Text>
        <Text style={s.subtitle}>Please read and accept before continuing</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Section title="What Peptora is">
          Peptora is a tracking and reference tool. It records the schedule you set for yourself and
          keeps your log. It does not recommend doses, and it does not sell peptides or medication.
        </Section>

        <Section title="Not medical advice">
          Nothing in Peptora is medical advice, diagnosis or treatment. The library summarises published
          research and regulatory documents for educational reading, and links to its sources. It has not
          been reviewed or approved by the FDA or any other regulator. Talk to a qualified clinician about
          your own protocol.
        </Section>

        {FEATURES.calculator && (
          <Section title="The calculator">
            The reconstitution calculator does arithmetic on numbers you enter. It never fills in an amount
            for you. Check every figure yourself before you rely on it.
          </Section>
        )}

        <Section title="Age">
          You must be at least 18 years old to use Peptora. By accepting these terms you confirm that
          you are.
        </Section>

        <Section title="Your data">
          Peptora stores your email address, your protocols and your log so that it can show them to you.
          It does not sell your data. Push notifications are optional and can be turned off in your device
          settings. You can delete your account, and everything stored with it, at any time from Profile.
        </Section>

        <Section title="Changes to these terms">
          These terms may be updated. Continuing to use the app after a change means you accept the
          updated terms.
        </Section>

        <View style={s.links}>
          <TouchableOpacity onPress={() => Linking.openURL(LINKS.terms).catch(() => {})} accessibilityRole="link">
            <Text style={s.link}>Terms of Use</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(LINKS.privacy).catch(() => {})} accessibilityRole="link">
            <Text style={s.link}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.acceptBtn, loading && s.btnDisabled]}
          onPress={handleAccept}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#021a0e" />
            : <Text style={s.acceptText}>I Agree and Continue</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={s.declineBtn} onPress={handleDecline} disabled={loading}>
          <Text style={s.declineText}>Decline and sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.sectionBody}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  logo: { color: colors.teal, fontSize: 22, fontWeight: "800", letterSpacing: 1, marginBottom: 8 },
  title: { color: colors.tx, fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: colors.tx2, fontSize: 13, textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 8 },
  links: { flexDirection: "row", justifyContent: "center", gap: 24, marginBottom: 16 },
  link: { color: colors.teal, fontSize: 14, fontWeight: "600" },
  section: {
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.teal, fontSize: 13, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionBody: { color: colors.tx2, fontSize: 14, lineHeight: 22 },
  footer: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  acceptBtn: {
    backgroundColor: colors.teal,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  acceptText: { color: "#021a0e", fontSize: 16, fontWeight: "700" },
  declineBtn: { padding: 12, alignItems: "center" },
  declineText: { color: colors.tx3, fontSize: 14 },
});
