import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";

/** The rounded card that holds a group of rows. */
export function SettingsCard({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/**
 * One row of a settings list: an icon, a label with an optional second line,
 * a short value on the right, and a chevron when it can be pressed.
 */
export function SettingsRow({ icon, label, detail, value, valueColor, onPress, last, busy, destructive }) {
  const content = (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      {icon ? <Ionicons name={icon} size={17} color={destructive ? colors.red : colors.tx2} /> : null}
      <View style={s.textColumn}>
        <Text style={[s.label, destructive && { color: colors.red }]}>{label}</Text>
        {detail ? <Text style={s.detail} numberOfLines={3}>{detail}</Text> : null}
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={colors.teal} />
      ) : value ? (
        <Text style={[s.value, valueColor && { color: valueColor }]} numberOfLines={1}>{value}</Text>
      ) : null}
      {onPress && !busy ? <Ionicons name="chevron-forward" size={15} color={colors.tx3} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} disabled={busy} activeOpacity={0.7} accessibilityRole="button">
      {content}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  textColumn: { flex: 1, minWidth: 0 },
  label: { color: colors.tx, fontSize: 14 },
  detail: { color: colors.tx3, fontSize: 12, lineHeight: 17, marginTop: 2 },
  value: { color: colors.tx2, fontSize: 13, fontWeight: "600", maxWidth: "45%" },
});
