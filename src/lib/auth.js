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
    // No response at all means the phone is offline or the API is down, not
    // that the session ended. Rethrow so react-query keeps the last known
    // session on screen instead of replacing it with "signed out".
    if (!e.response) throw e;
    if ([401, 403].includes(e.response.status)) await clearTokens();
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

// Whether this account can use the Pro features right now, as decided by the
// server. Never recompute it from the dates here: the phone's clock and the
// server's disagree, and a phone running fast would lock out someone who just
// subscribed.
export function useAccess() {
  const { user, loading, refresh } = useAuthSession();
  const access = user?.access ?? null;
  return {
    user,
    loading,
    refresh,
    access,
    hasAccess: !!access?.has_access,
  };
}

// Call after login/signup/consent changes so the cached session reflects
// the latest server state instead of waiting out staleTime. Resolves once the
// fresh session is in the cache.
//
// This fetches rather than invalidates. Invalidating only refetches while some
// screen is watching the session, and the consent screen is shown with nothing
// else mounted: accepting the terms then returned to the tabs with the old
// "not accepted" session still cached, which sent the person straight back to
// the consent screen.
export async function invalidateAuthSession(queryClient) {
  // A request already in flight was made with the old tokens (or none), so
  // its answer must not be the one that lands.
  await queryClient.cancelQueries({ queryKey: AUTH_SESSION_KEY });
  return queryClient
    .fetchQuery({ queryKey: AUTH_SESSION_KEY, queryFn: fetchSession, staleTime: 0 })
    .catch(() => null);
}

// The library is public reference content, the same for everyone, so it is
// the one thing that survives a sign-out.
const PUBLIC_QUERY_ROOTS = new Set(["peptides", "peptide", "stacks", "stack"]);

// Sign the device out of everything it has cached. Used on logout, on
// declining consent and after an account is deleted, so the next person to
// use the device never sees someone else's data.
//
// queryClient.clear() is not enough on its own: it drops the cache but does
// not tell the screens that are already mounted, so Profile and Home kept
// showing the old account until the app was restarted. Setting the session to
// "signed out" is what re-renders them. Requests still in flight are
// cancelled first so that a late answer cannot sign the old account back in.
export function clearAllCaches(queryClient) {
  const isPrivate = (query) => !PUBLIC_QUERY_ROOTS.has(query.queryKey[0]);
  queryClient.cancelQueries({ predicate: isPrivate });
  queryClient.setQueryData(AUTH_SESSION_KEY, null);
  queryClient.removeQueries({
    predicate: (query) => isPrivate(query) && query.queryKey[0] !== AUTH_SESSION_KEY[0],
  });
}

export function AuthPrompt({ title = "Log in to continue", subtitle }) {
  const router = useRouter();

  return (
    <View style={s.center}>
      <Text style={s.heading}>{title}</Text>
      <Text style={s.sub}>
        {subtitle || "Create an account or log in to use this part of Peptora."}
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
