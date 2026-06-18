import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { colors, fonts } from "../lib/theme";

const PRESETS = [5, 10, 15];

export default function VialStrengthInput({ value, onChange }) {
  return (
    <View>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="e.g. 5"
        placeholderTextColor={colors.tx3}
      />
      <View style={s.presets}>
        {PRESETS.map((mg) => (
          <TouchableOpacity
            key={mg}
            style={[s.chip, value === String(mg) && s.chipActive]}
            onPress={() => onChange(String(mg))}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, value === String(mg) && s.chipTextActive]}>
              {mg} mg
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    color: colors.tx,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  presets: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: "rgba(0,214,143,0.12)",
    borderColor: colors.teal,
  },
  chipText: { color: colors.tx2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.teal },
});
