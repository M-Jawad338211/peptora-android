import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api";
import { clearTokens, getStoredToken } from "../api/client";
import { registerPushNotifications } from "./notifications";
import { colors } from "./theme";

export const AUTH_SESSION_KEY = ["auth", "session"];

async function fetchSession() {
  const token = await getStoredToken();
  if (!token) return null;
  try {
    const response = await authApi.me();
    if (!response.data?.email_verified) {
      await clearTokens();
      return null;
    }
    registerPushNotifications(); // fire-and-forget, safe to call on every session load
    return response.data;
  } catch (e) {
    if ([401, 403].includes(e.response?.status)) await clearTokens();
    return null;
  }
}

// Backed by react-query so the session is cached across tab switches and
// remounts instead of re-showing a spinner every time this hook is used.
export function useAuthSession() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: AUTH_SESSION_KEY,
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
  });

  const setUser = (user) => queryClient.setQueryData(AUTH_SESSION_KEY, user);

  return { user: data ?? null, loading: isLoading, refresh: refetch, setUser };
}

// Call after login/signup/consent changes so the cached session reflects
// the latest server state instead of waiting out staleTime.
export function invalidateAuthSession(queryClient) {
  return queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY });
}

// Wipe all cached data (auth + everything else) — used on logout so the
// next person to use the device never sees a stale, signed-in cache.
export function clearAllCaches(queryClient) {
  queryClient.clear();
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
