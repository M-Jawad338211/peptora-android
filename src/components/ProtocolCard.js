import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";

const STATUS_COLOR = {
  active: colors.teal,
  paused: colors.yellow,
  completed: colors.tx3,
};

const STATUS_ICON = {
  active: "play-circle",
  paused: "pause-circle",
  completed: "checkmark-circle",
};

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProtocolCard({ protocol, onPress, onLongPress }) {
  const statusColor = STATUS_COLOR[protocol.status] || colors.tx3;
  const statusIcon = STATUS_ICON[protocol.status] || "ellipse";

  return (
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <View style={s.row}>
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>{protocol.label || protocol.peptide_name || "Protocol"}</Text>
          <Text style={s.peptide} numberOfLines={1}>{protocol.peptide_name || "—"}</Text>
        </View>
        <View style={s.statusBadge}>
          <Ionicons name={statusIcon} size={13} color={statusColor} />
          <Text style={[s.statusText, { color: statusColor }]}>
            {protocol.status?.charAt(0).toUpperCase() + protocol.status?.slice(1)}
          </Text>
        </View>
      </View>

      <View style={s.detailRow}>
        {protocol.frequency ? (
          <View style={s.chip}>
            <Ionicons name="time-outline" size={11} color={colors.tx3} />
            <Text style={s.chipText}>{protocol.frequency}</Text>
          </View>
        ) : null}
        {protocol.vial_mg ? (
          <View style={s.chip}>
            <Ionicons name="flask-outline" size={11} color={colors.tx3} />
            <Text style={s.chipText}>{protocol.vial_mg} mg vial</Text>
          </View>
        ) : null}
        {protocol.target_dose_mcg ? (
          <View style={s.chip}>
            <Ionicons name="medical-outline" size={11} color={colors.tx3} />
            <Text style={s.chipText}>{protocol.target_dose_mcg} {protocol.unit || "mcg"}/dose</Text>
          </View>
        ) : null}
      </View>

      <View style={s.footer}>
        <Text style={s.footerDate}>
          {protocol.start_date
            ? `Started ${formatDate(protocol.start_date)}`
            : `Created ${formatDate(protocol.created_at)}`}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.tx3} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  info: { flex: 1, marginRight: 10 },
  name: { color: colors.tx, fontSize: 16, fontWeight: "700", marginBottom: 2 },
  peptide: { color: colors.tx2, fontSize: 13 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
  detailRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  chipText: { color: colors.tx3, fontSize: 11 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerDate: { color: colors.tx3, fontSize: 12 },
});
