import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../lib/theme";

export default function AlternativesTable({ alternatives, recommendedWater }) {
  if (!alternatives?.length) return null;
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Alternative Water Volumes</Text>
      <View style={s.headerRow}>
        <Text style={[s.cell, s.header, s.colWater]}>Water</Text>
        <Text style={[s.cell, s.header, s.colUnits]}>Units/dose</Text>
        <Text style={[s.cell, s.header, s.colConc]}>Conc.</Text>
        <Text style={[s.cell, s.header, s.colDoses]}>Doses</Text>
      </View>
      {alternatives.map((a) => {
        const isRec = a.water_ml === recommendedWater;
        return (
          <View key={a.water_ml} style={[s.row, isRec && s.rowRec]}>
            <Text style={[s.cell, s.colWater, isRec && s.recText]}>
              {a.water_ml} mL{isRec ? " ✓" : ""}
            </Text>
            <Text style={[s.cell, s.colUnits, isRec && s.recText]}>
              {a.units_per_dose.toFixed(1)}
            </Text>
            <Text style={[s.cell, s.colConc, isRec && s.recText]}>
              {a.concentration.toFixed(0)}
            </Text>
            <Text style={[s.cell, s.colDoses, isRec && s.recText]}>
              {a.doses_per_vial}
            </Text>
          </View>
        );
      })}
      <Text style={s.footnote}>Conc. in mcg/mL · Units on U-100 syringe</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 16 },
  title: {
    color: colors.tx2,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  headerRow: { flexDirection: "row", marginBottom: 4 },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowRec: { backgroundColor: "rgba(0,214,143,0.06)", borderRadius: 6 },
  cell: { fontFamily: fonts.mono, fontSize: 13, color: colors.tx2 },
  header: { color: colors.tx3, fontSize: 11 },
  recText: { color: colors.teal, fontWeight: "700" },
  colWater: { flex: 2 },
  colUnits: { flex: 2 },
  colConc: { flex: 2 },
  colDoses: { flex: 1, textAlign: "right" },
  footnote: { color: colors.tx3, fontSize: 11, marginTop: 6 },
});
