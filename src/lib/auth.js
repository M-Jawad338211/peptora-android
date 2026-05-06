import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "../api";
import { clearTokens, getStoredToken } from "../api/client";
import { colors } from "./theme";

export function useAuthSession() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getStoredToken();
      if (!token) {
        setUser(null);
        return null;
      }
      const response = await authApi.me();
      if (!response.data?.email_verified) {
        await clearTokens();
        setUser(null);
        return null;
      }
      setUser(response.data);
      return response.data;
    } catch (e) {
      if ([401, 403].includes(e.response?.status)) await clearTokens();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, refresh, setUser };
}

export function AuthPrompt({ title = "Log in to continue", subtitle }) {
  const router = useRouter();

  return (
    <View style={s.center}>
      <Text style={s.heading}>{title}</Text>
      <Text style={s.sub}>
        {subtitle || "Create an account or log in to access this Peptora feature."}
      </Text>
      <TouchableOpacity style={s.btn} onPress={() => router.push("/auth/login")}>
        <Text style={s.btnText}>Log In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.outline} onPress={() => router.push("/auth/signup")}>
        <Text style={s.outlineText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

export function AuthGate({ children, title, subtitle }) {
  const { user, loading } = useAuthSession();

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (!user) return <AuthPrompt title={title} subtitle={subtitle} />;

  return typeof children === "function" ? children(user) : children;
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    backgroundColor: colors.navy,
  },
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
    marginBottom: 24,
  },
  btn: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  btnText: { color: "#021a0e", fontSize: 16, fontWeight: "700" },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    width: "100%",
  },
  outlineText: { color: colors.tx, fontSize: 16 },
});
