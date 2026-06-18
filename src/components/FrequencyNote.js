import { View, Text, StyleSheet } from "react-native";
import { colors } from "../lib/theme";

export default function FrequencyNote({ frequency, framing }) {
  if (!frequency) return null;
  return (
    <View style={s.wrap}>
      <Text style={s.label}>Reported Frequency</Text>
      <Text style={s.value}>{frequency}</Text>
      <Text style={s.disclaimer}>
        {framing ?? "Studied / reported range — not a recommendation."}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.tx3,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: { color: colors.tx2, fontSize: 14, marginBottom: 6 },
  disclaimer: { color: colors.tx3, fontSize: 12, fontStyle: "italic" },
});
