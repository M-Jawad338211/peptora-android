import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";

export default function WarningsCallout({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <View style={s.wrap}>
      <View style={s.titleRow}>
        <Ionicons name="warning-outline" size={15} color="#ffd32a" />
        <Text style={s.title}>Notes</Text>
      </View>
      {warnings.map((w, i) => (
        <Text key={i} style={s.item}>· {w}</Text>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "rgba(255,211,42,0.07)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,211,42,0.25)",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  title: { color: "#ffd32a", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  item: { color: "#ffd32a", fontSize: 13, marginBottom: 4, lineHeight: 19 },
});
