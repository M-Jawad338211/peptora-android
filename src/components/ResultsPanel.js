import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../lib/theme";
import SyringeVisual from "./SyringeVisual";
import AlternativesTable from "./AlternativesTable";
import FrequencyNote from "./FrequencyNote";
import WarningsCallout from "./WarningsCallout";

function StatCard({ label, value, highlight }) {
  return (
    <View style={[s.card, highlight && s.cardHighlight]}>
      <Text style={s.cardValue}>{value}</Text>
      <Text style={s.cardLabel}>{label}</Text>
    </View>
  );
}

export default function ResultsPanel({ result, peptideName }) {
  const [dosesPerDay, setDosesPerDay] = useState(1);

  if (!result?.ok) return null;

  const { syringe, concentration_label, target_dose_label, doses_per_vial,
          recommended_water_ml, alternatives, suggested_frequency, warnings,
          mode } = result;

  const days = dosesPerDay > 0 ? Math.round(doses_per_vial / dosesPerDay) : null;
  const durationNote = days != null
    ? `~${doses_per_vial} doses · ~${days} day${days !== 1 ? "s" : ""} at ${dosesPerDay}/day`
    : `~${doses_per_vial} doses`;

  return (
    <View style={s.wrap}>
      <Text style={s.title}>
        {peptideName ? `Results for ${peptideName}` : "Results"}
      </Text>

      {/* Headline cards */}
      <View style={s.cards}>
        <StatCard label="Concentration" value={concentration_label} />
        <StatCard label="Target Dose" value={target_dose_label} />
      </View>
      <View style={s.cards}>
        {mode === "inverse" && recommended_water_ml != null && (
          <StatCard label="Add BAC Water" value={`${recommended_water_ml} mL`} highlight />
        )}
        <StatCard label="Doses / Vial" value={String(doses_per_vial)} />
      </View>

      {/* Draw volume + units */}
      <View style={s.drawRow}>
        <View style={s.drawCard}>
          <Text style={s.drawNum}>{syringe.draw_volume_ml.toFixed(3)}</Text>
          <Text style={s.drawUnit}>mL to draw</Text>
        </View>
        <View style={[s.drawCard, s.drawCardHighlight]}>
          <Text style={[s.drawNum, s.drawNumTeal]}>{syringe.draw_units.toFixed(1)}</Text>
          <Text style={s.drawUnit}>units on {syringe.type}</Text>
        </View>
      </View>

      {/* Syringe visual */}
      <SyringeVisual units={syringe.draw_units} maxUnits={syringe.capacity_units} />

      {/* Mode B alternatives */}
      {mode === "inverse" && (
        <AlternativesTable alternatives={alternatives} recommendedWater={recommended_water_ml} />
      )}

      {/* Vial duration */}
      <View style={s.durationRow}>
        <Text style={s.durationText}>{durationNote}</Text>
        <View style={s.stepper}>
          <TouchableOpacity
            style={s.stepBtn}
            onPress={() => setDosesPerDay((d) => Math.max(1, d - 1))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="remove" size={14} color={colors.tx3} />
          </TouchableOpacity>
          <Text style={s.stepVal}>{dosesPerDay}/day</Text>
          <TouchableOpacity
            style={s.stepBtn}
            onPress={() => setDosesPerDay((d) => d + 1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={14} color={colors.tx3} />
          </TouchableOpacity>
        </View>
      </View>

      <FrequencyNote frequency={suggested_frequency} />
      <WarningsCallout warnings={warnings} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "rgba(0,214,143,0.18)",
  },
  title: { color: colors.teal, fontSize: 15, fontWeight: "700", marginBottom: 14 },
  cards: { flexDirection: "row", gap: 10, marginBottom: 10 },
  card: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlight: {
    backgroundColor: "rgba(0,214,143,0.10)",
    borderColor: "rgba(0,214,143,0.35)",
  },
  cardValue: { color: colors.tx, fontSize: 15, fontWeight: "700", marginBottom: 3 },
  cardLabel: { color: colors.tx3, fontSize: 11 },
  drawRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  drawCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  drawCardHighlight: {
    backgroundColor: "rgba(0,214,143,0.08)",
    borderColor: "rgba(0,214,143,0.25)",
  },
  drawNum: { fontFamily: fonts.mono, fontSize: 24, fontWeight: "700", color: colors.tx },
  drawNumTeal: { color: colors.teal },
  drawUnit: { color: colors.tx3, fontSize: 12, marginTop: 3 },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  durationText: { color: colors.tx2, fontSize: 13, flex: 1 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepVal: { color: colors.tx2, fontSize: 13, fontWeight: "600", minWidth: 44, textAlign: "center" },
});
