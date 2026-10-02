import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, fonts } from "../lib/theme";
import { dilution_note } from "../lib/reconstitution";

/** Trims the trailing ".0" so a clean draw reads "20 units", not "20.0 units". */
function fmtUnits(n) {
  return n >= 10 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "");
}

/**
 * Mode B's water control. Replaces the old "Preferred Draw Size (units)" input,
 * which asked the user to specify a means (syringe units) when all they had was
 * an end (how much water to add) — and then rounded their answer away.
 *
 * Each card is an outcome computed forward from a real volume, so the units
 * shown are the units they will get. The one tagged "Easiest to read" is the
 * volume that puts the draw closest to 20 units on the barrel: a statement
 * about the syringe scale, not about the dose.
 */
export default function DilutionPicker({ dilution, value, onChange, syringeType = "U-100", doseLabel }) {
  return (
    <View>
      <Text style={s.label}>Water volume</Text>

      {!dilution?.options?.length ? (
        <Text style={s.hint}>Enter the vial amount and your dose to compare volumes.</Text>
      ) : (
        <>
          <View style={s.grid}>
            {dilution.options.map((o) => {
              const active = o.water_ml === value;
              const recommended = o.water_ml === dilution.recommended_water_ml;
              const note = dilution_note(o, syringeType);
              return (
                <TouchableOpacity
                  key={o.water_ml}
                  style={[s.card, active && s.cardActive]}
                  onPress={() => onChange(o.water_ml)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={
                    `Add ${o.water_ml} millilitres, draw ${fmtUnits(o.units_per_dose)} units per dose` +
                    (note ? `, ${note.toLowerCase()}` : "") +
                    (recommended ? ", easiest to read" : "")
                  }
                >
                  <Text style={[s.water, active && s.waterActive]}>{o.water_ml} mL</Text>
                  <Text style={s.units}>{fmtUnits(o.units_per_dose)} units</Text>
                  <Text
                    style={[
                      s.note,
                      (o.quality === "tiny" || o.quality === "over") && s.noteWarn,
                      !note && recommended && s.noteRec,
                    ]}
                    numberOfLines={2}
                  >
                    {note ?? (recommended ? "Easiest to read" : " ")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.hint}>
            Every option gives the same{doseLabel ? ` ${doseLabel}` : ""} dose. More water only
            spreads it across more units on the barrel, which is easier to read.
          </Text>
        </>
      )}
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    // Three per row on a phone; the engine caps the list at five, so a full
    // set wraps to two rows without a horizontal scroll.
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 78,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cardActive: { borderColor: colors.teal, backgroundColor: "rgba(0,214,143,0.12)" },
  water: { fontFamily: fonts.mono, fontSize: 15, fontWeight: "700", color: colors.tx },
  waterActive: { color: colors.teal },
  units: { color: colors.tx2, fontSize: 12, marginTop: 2 },
  note: { color: colors.tx3, fontSize: 10, lineHeight: 13, marginTop: 2, textAlign: "center" },
  noteWarn: { color: colors.yellow },
  noteRec: { color: colors.teal },
  hint: { color: colors.tx3, fontSize: 12, marginTop: 8, lineHeight: 18 },
});
