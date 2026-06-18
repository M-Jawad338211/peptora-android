import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../lib/theme";

export default function ReconstitutedToggle({ value, onChange }) {
  return (
    <View style={s.row}>
      {[
        { label: "Already reconstituted", val: true },
        { label: "Not yet reconstituted", val: false },
      ].map(({ label, val }) => (
        <TouchableOpacity
          key={String(val)}
          style={[s.option, value === val && s.optionActive]}
          onPress={() => onChange(val)}
          activeOpacity={0.8}
        >
          <Text style={[s.label, value === val && s.labelActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  option: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
  },
  optionActive: {
    borderColor: colors.teal,
    backgroundColor: "rgba(0,214,143,0.10)",
  },
  label: { color: colors.tx2, fontSize: 13, fontWeight: "600", textAlign: "center" },
  labelActive: { color: colors.teal },
});
