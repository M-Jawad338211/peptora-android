import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";

/** The profile photo in a circle, or the initial letter when there is none. */
export default function Avatar({ uri, initial, size = 52, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[round, s.photo, style]}
        onError={() => setFailed(true)}
        accessibilityLabel="Profile photo"
      />
    );
  }
  return (
    <View style={[round, s.initial, style]} accessibilityLabel="No profile photo">
      <Text style={[s.initialText, { fontSize: Math.round(size * 0.42) }]}>{initial}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  photo: { backgroundColor: colors.surface },
  initial: { backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  initialText: { color: "#021a0e", fontWeight: "700" },
});
