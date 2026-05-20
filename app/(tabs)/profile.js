import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { colors } from "../../src/lib/theme";
import { authApi } from "../../src/api";
import { clearTokens } from "../../src/api/client";
import { AuthPrompt, useAuthSession } from "../../src/lib/auth";

export default function ProfileTab() {
  const { user, loading, setUser } = useAuthSession();

  const logout = async () => {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await authApi.logout().catch(() => {});
          await clearTokens();
          setUser(null);
        },
      },
    ]);
  };

  if (loading)
    return (
      <View style={s.center}>
        <Text style={s.muted}>Loading…</Text>
      </View>
    );

  if (!user)
    return (
      <AuthPrompt
        title="Your Account"
        subtitle="Sign in to track your cycle and access Peptora features."
      />
    );

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      <View style={s.profileCard}>
        <Text style={s.avatar}>{user.email[0].toUpperCase()}</Text>
        <Text style={s.email}>{user.email}</Text>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  center: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  icon: { fontSize: 56, marginBottom: 16 },
  heading: {
    color: colors.tx,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  sub: {
    color: colors.tx2,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
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
  email: { color: colors.tx, fontSize: 15, fontWeight: "600", marginBottom: 4 },
  muted: { color: colors.tx3 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,71,87,0.3)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  logoutText: { color: colors.red, fontSize: 15, fontWeight: "600" },
});
