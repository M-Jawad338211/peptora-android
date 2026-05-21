import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "../src/api";
import { clearTokens } from "../src/api/client";
import { colors } from "../src/lib/theme";

export default function ConsentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await authApi.acceptConsent();
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Could not save your consent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline Terms",
      "You must accept the Terms of Use to access Peptora. Declining will sign you out.",
      [
        { text: "Go Back", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await authApi.logout().catch(() => {});
            await clearTokens();
            router.replace("/auth/login");
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
        <Section title="Research Use Only">
          Peptora is intended solely for informational and research purposes. All content, calculations, and AI-generated
          responses are for educational use only and do not constitute medical advice, diagnosis, or treatment.
          Always consult a qualified healthcare professional before making any decisions about peptide use.
        </Section>

        <Section title="No Medical Advice">
          Nothing in this app should be interpreted as medical advice. The dosage calculations and peptide
          information provided are based on publicly available research and are not reviewed or approved by
          the FDA or any other regulatory authority.
        </Section>

        <Section title="Age Requirement">
          You must be at least 18 years of age to use Peptora. By accepting these terms you confirm
          that you meet this age requirement.
        </Section>

        <Section title="Assumption of Risk">
          Use of peptides carries inherent risks. Peptora assumes no liability for any harm, injury, or
          adverse effects resulting from the use of information provided in this app. You use this app
          entirely at your own risk.
        </Section>

        <Section title="Privacy">
          We collect your email, usage data, and cycle logs solely to provide and improve the Peptora
          service. We do not sell your data to third parties. Push notifications are optional and
          can be managed through your device settings.
        </Section>

        <Section title="Changes to Terms">
          Peptora reserves the right to update these terms at any time. Continued use of the app
          after changes constitutes acceptance of the new terms.
        </Section>
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
          <Text style={s.declineText}>Decline & Sign Out</Text>
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
