import { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { colors } from "../../src/lib/theme";
import { authApi } from "../../src/api";
import { clearTokens } from "../../src/api/client";
import { useAuthSession, AuthPrompt, clearAllCaches } from "../../src/lib/auth";
import { useRouter } from "expo-router";

function SkeletonBlock({ width, height, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: 8, backgroundColor: colors.surface },
        { opacity },
        style,
      ]}
    />
  );
}

function ProfileSkeleton() {
  return (
    <View style={s.container}>
      <View style={{ padding: 20 }}>
        {/* Profile card skeleton */}
        <View style={s.profileCard}>
          <SkeletonBlock width={52} height={52} style={{ borderRadius: 26 }} />
          <View style={{ gap: 8, flex: 1 }}>
            <SkeletonBlock width="60%" height={14} />
            <SkeletonBlock width="40%" height={12} />
          </View>
        </View>
        {/* Logout button skeleton */}
        <SkeletonBlock width="100%" height={48} style={{ borderRadius: 12, marginTop: 8 }} />
      </View>
    </View>
  );
}

export default function ProfileTab() {
  const { user, loading } = useAuthSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const logout = async () => {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await authApi.logout().catch(() => {});
          await clearTokens();
          clearAllCaches(queryClient);
          router.replace("/auth/login");
        },
      },
    ]);
  };

  if (loading) return <ProfileSkeleton />;
  if (!user) return <AuthPrompt title="Log in to view your profile" />;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      <View style={s.profileCard}>
        <Text style={s.avatar}>{user.email[0].toUpperCase()}</Text>
        <View>
          <Text style={s.email}>{user.email}</Text>
          {user.full_name ? <Text style={s.name}>{user.full_name}</Text> : null}
        </View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
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
  email: { color: colors.tx, fontSize: 15, fontWeight: "600" },
  name: { color: colors.tx2, fontSize: 13, marginTop: 2 },
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
