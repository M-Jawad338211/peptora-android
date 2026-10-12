import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";

const KINDS = {
  error: { icon: "alert-circle", color: colors.red, bg: "rgba(255,71,87,0.08)", border: "rgba(255,71,87,0.45)" },
  success: { icon: "checkmark-circle", color: colors.teal, bg: "rgba(0,214,143,0.08)", border: "rgba(0,214,143,0.45)" },
  warning: { icon: "warning", color: colors.yellow, bg: "rgba(255,211,42,0.07)", border: "rgba(255,211,42,0.30)" },
  info: { icon: "information-circle", color: colors.tx2, bg: "rgba(255,255,255,0.04)", border: colors.border },
};

/** A short message in a flat box: an error, a result, a warning or a note. */
export default function Notice({ kind = "info", title, children, style }) {
  const k = KINDS[kind] ?? KINDS.info;
  return (
    <View
      style={[s.box, { backgroundColor: k.bg, borderColor: k.border }, style]}
      accessibilityRole={kind === "error" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={k.icon} size={18} color={k.color} style={s.icon} />
      <View style={s.body}>
        {title ? <Text style={s.title}>{title}</Text> : null}
        {children ? <Text style={s.text}>{children}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12,
  },
  icon: { marginTop: 1 },
  body: { flex: 1, minWidth: 0 },
  title: { color: colors.tx, fontSize: 14, fontWeight: "700", marginBottom: 2 },
  text: { color: colors.tx, fontSize: 14, lineHeight: 20 },
});
