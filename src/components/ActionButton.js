import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";

const VARIANTS = {
  primary: { box: { backgroundColor: colors.teal, padding: 15 }, text: { color: "#021a0e", fontSize: 16, fontWeight: "700" }, spinner: "#021a0e", icon: "#021a0e" },
  secondary: { box: { borderWidth: 1, borderColor: colors.teal, padding: 13 }, text: { color: colors.teal, fontSize: 15, fontWeight: "700" }, spinner: colors.teal, icon: colors.teal },
  quiet: { box: { borderWidth: 1, borderColor: colors.border, padding: 13 }, text: { color: colors.tx, fontSize: 15, fontWeight: "600" }, spinner: colors.tx, icon: colors.tx2 },
  danger: { box: { borderWidth: 1, borderColor: "rgba(255,71,87,0.55)", padding: 13 }, text: { color: colors.red, fontSize: 15, fontWeight: "700" }, spinner: colors.red, icon: colors.red },
  link: { box: { padding: 8 }, text: { color: colors.teal, fontSize: 15, fontWeight: "600" }, spinner: colors.teal, icon: colors.teal },
};

/**
 * The buttons of the settings screens. `busy` shows a spinner and blocks the
 * press, so a second tap cannot send the request twice.
 */
export default function ActionButton({
  label, onPress, variant = "primary", icon, busy = false, disabled = false, style, accessibilityLabel,
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const inactive = disabled || busy;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy }}
      style={[s.base, v.box, inactive && s.inactive, style]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={v.spinner} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={v.icon} /> : null}
          <Text style={[v.text, s.label]} numberOfLines={2}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius: 12, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8, minHeight: 48,
  },
  inactive: { opacity: 0.5 },
  label: { textAlign: "center", flexShrink: 1 },
});
