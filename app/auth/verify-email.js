import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { authApi } from "../../src/api";
import { saveTokens } from "../../src/api/client";
import { colors } from "../../src/lib/theme";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(String(params.email || ""));
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verify = async () => {
    if (!email || otp.length !== 6) {
      Alert.alert("Error", "Enter your email and 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const r = await authApi.verifyEmail(email, otp);
      await saveTokens(r.data.access_token, r.data.refresh_token);
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Verification failed", e.response?.data?.detail || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) {
      Alert.alert("Error", "Enter your email first");
      return;
    }
    setResending(true);
    try {
      await authApi.resendVerificationOtp(email);
      Alert.alert("Code sent", "Check your email for a new verification code.");
    } catch (e) {
      Alert.alert("Could not resend", e.response?.data?.detail || "Try again in a moment");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.inner}>
        <Text style={s.title}>Verify your email</Text>
        <Text style={s.sub}>Enter the 6-digit code sent to your email address.</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.tx3}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={[s.input, s.otp]}
          value={otp}
          onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={colors.tx3}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={verify} disabled={loading}>
          <Text style={s.btnText}>{loading ? "Verifying..." : "Verify Email"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={resend} disabled={resending}>
          <Text style={s.link}>{resending ? "Sending..." : "Send a new code"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  inner: { flex: 1, padding: 28, justifyContent: "center" },
  title: { color: colors.tx, fontSize: 28, fontWeight: "700", marginBottom: 6 },
  sub: { color: colors.tx2, fontSize: 14, lineHeight: 22, marginBottom: 28 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    color: colors.tx,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  otp: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "center",
  },
  btn: { backgroundColor: colors.teal, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#021a0e", fontSize: 16, fontWeight: "700" },
  link: { color: colors.teal, fontSize: 14, textAlign: "center", marginTop: 20 },
});
