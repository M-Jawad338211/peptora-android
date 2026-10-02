import { forwardRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../lib/theme";
import VialSyringe from "./VialSyringe";
import WarningsCallout from "./WarningsCallout";

function StatCard({ label, value, highlight }) {
  return (
    <View style={[s.card, highlight && s.cardHighlight]}>
      <Text style={s.cardValue}>{value}</Text>
      <Text style={s.cardLabel}>{label}</Text>
    </View>
  );
}

/**
 * The worked result for a protocol: concentration, the draw in mL and units,
 * and the vial and syringe picture. Arithmetic only, on the numbers the user
 * entered. The ref is passed through to the picture so a hold button can
 * replay the draw.
 */
const ResultsPanel = forwardRef(function ResultsPanel({ result, peptideName, style }, ref) {
  const [dosesPerDay, setDosesPerDay] = useState(1);

  if (!result?.ok) return null;

  const { syringe, concentration_label, target_dose_label, doses_per_vial,
          recommended_water_ml, warnings, mode, vial_mg, water_ml } = result;

  const days = dosesPerDay > 0 ? Math.round(doses_per_vial / dosesPerDay) : null;
  const durationNote = days != null
    ? `About ${doses_per_vial} doses, about ${days} day${days !== 1 ? "s" : ""} at ${dosesPerDay} a day`
    : `About ${doses_per_vial} doses`;

  return (
    <View style={[s.wrap, style]}>
      <Text style={s.title}>
        {peptideName ? `Calculation for ${peptideName}` : "Calculation"}
      </Text>

      {/* Headline cards */}
      <View style={s.cards}>
        <StatCard label="Concentration" value={concentration_label} />
        <StatCard label="Your dose" value={target_dose_label} />
      </View>
      <View style={s.cards}>
        {mode === "inverse" && recommended_water_ml != null && (
          <StatCard label="Water volume" value={`${recommended_water_ml} mL`} highlight />
        )}
        <StatCard label="Doses per vial" value={String(doses_per_vial)} />
        <StatCard label="Volume to draw" value={`${syringe.draw_volume_ml.toFixed(3)} mL`} />
      </View>

      {/* Vial and syringe */}
      <View style={s.visual}>
        <VialSyringe
          ref={ref}
          vialMg={vial_mg ?? 0}
          waterMl={water_ml ?? 0}
          units={syringe.draw_units}
          maxUnits={syringe.capacity_units}
        />
      </View>

      {/* Vial duration */}
      <View style={s.durationRow}>
        <Text style={s.durationText}>{durationNote}</Text>
        <View style={s.stepper}>
          <TouchableOpacity
            style={s.stepBtn}
            onPress={() => setDosesPerDay((d) => Math.max(1, d - 1))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Fewer per day"
          >
            <Ionicons name="remove" size={14} color={colors.tx3} />
          </TouchableOpacity>
          <Text style={s.stepVal}>{dosesPerDay} a day</Text>
          <TouchableOpacity
            style={s.stepBtn}
            onPress={() => setDosesPerDay((d) => d + 1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="More per day"
          >
            <Ionicons name="add" size={14} color={colors.tx3} />
          </TouchableOpacity>
        </View>
      </View>

      <WarningsCallout warnings={warnings} />
    </View>
  );
});

export default ResultsPanel;

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
  cardValue: { color: colors.tx, fontSize: 15, fontWeight: "700", marginBottom: 3, fontFamily: fonts.mono },
  cardLabel: { color: colors.tx3, fontSize: 11 },
  visual: { marginTop: 6 },
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
  stepVal: { color: colors.tx2, fontSize: 13, fontWeight: "600", minWidth: 50, textAlign: "center" },
});
