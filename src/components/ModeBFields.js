import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../lib/theme";

const SYRINGE_TYPES = ["U-100", "U-50", "U-40"];
const UNITS = ["mcg", "mg", "IU"];

export default function ModeBFields({ fields, onChange, availableUnits }) {
  const { targetDose, unit, syringeType, preferredUnits } = fields;
  const units = availableUnits ?? UNITS;

  return (
    <View>
      <Text style={s.label}>Target Dose</Text>
      <View style={s.doseRow}>
        <TextInput
          style={[s.input, s.doseInput]}
          value={targetDose}
          onChangeText={(v) => onChange("targetDose", v)}
          keyboardType="decimal-pad"
          placeholder="e.g. 250"
          placeholderTextColor={colors.tx3}
        />
        <View style={s.unitChips}>
          {units.map((u) => (
            <TouchableOpacity
              key={u}
              style={[s.chip, unit === u && s.chipActive]}
              onPress={() => onChange("unit", u)}
              activeOpacity={0.7}
            >
              <Text style={[s.chipText, unit === u && s.chipTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={s.label}>Syringe Type</Text>
      <View style={s.row}>
        {SYRINGE_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.chip, syringeType === t && s.chipActive]}
            onPress={() => onChange("syringeType", t)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, syringeType === t && s.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Preferred Draw Size (units)</Text>
      <TextInput
        style={s.input}
        value={preferredUnits}
        onChangeText={(v) => onChange("preferredUnits", v)}
        keyboardType="decimal-pad"
        placeholder="20"
        placeholderTextColor={colors.tx3}
      />
      <Text style={s.hint}>
        The calculator will recommend a water volume that puts this many units in your syringe per dose.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  label: {
    color: colors.tx2,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    color: colors.tx,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doseRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  doseInput: { flex: 1 },
  unitChips: { flexDirection: "row", gap: 6 },
  row: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: "rgba(0,214,143,0.12)", borderColor: colors.teal },
  chipText: { color: colors.tx2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.teal },
  hint: { color: colors.tx3, fontSize: 12, marginTop: 6, lineHeight: 18 },
});
