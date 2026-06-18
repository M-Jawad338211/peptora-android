import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Platform, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { encyclopediaApi, calculatorApi } from "../api";
import { colors } from "../lib/theme";
import { getFingerprint } from "../lib/fingerprint";
import { calc_forward, calc_inverse, to_mcg } from "../lib/reconstitution";
import { protocolDefaultsFromPeptide } from "../lib/peptideDefaults";
import PeptideSelect from "./PeptideSelect";
import VialStrengthInput from "./VialStrengthInput";
import ReconstitutedToggle from "./ReconstitutedToggle";
import ModeAFields from "./ModeAFields";
import ModeBFields from "./ModeBFields";
import ResultsPanel from "./ResultsPanel";

const INITIAL_MODE_A = { bacMl: "", targetDose: "", unit: "mcg", syringeType: "U-100" };
const INITIAL_MODE_B = { targetDose: "", unit: "mcg", syringeType: "U-100", preferredUnits: "20" };

function ResearchBanner() {
  return (
    <View style={s.banner}>
      <Text style={s.bannerText}>
        For research and educational use only — not medical advice.
      </Text>
    </View>
  );
}

export default function ProtocolBuilder({ onCalculated }) {
  const queryClient = useQueryClient();

  const [peptideId, setPeptideId] = useState(null);
  const [vialMg, setVialMg] = useState("");
  const [reconstituted, setReconstituted] = useState(true);
  const [modeAFields, setModeAFields] = useState(INITIAL_MODE_A);
  const [modeBFields, setModeBFields] = useState(INITIAL_MODE_B);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);

  // Fetch full peptide detail when one is selected
  const { data: peptideDetail } = useQuery({
    queryKey: ["peptide", peptideId],
    queryFn: () => encyclopediaApi.get(peptideId).then((r) => r.data),
    enabled: !!peptideId,
    staleTime: 10 * 60 * 1000,
  });

  // When peptide changes, apply defaults
  useEffect(() => {
    if (!peptideDetail) return;
    const def = protocolDefaultsFromPeptide(peptideDetail);
    const unit = def.dose_unit;
    setModeAFields((prev) => ({ ...prev, unit }));
    setModeBFields((prev) => ({ ...prev, unit }));
    setResult(null);
    setErrors([]);
  }, [peptideDetail]);

  const availableUnits = peptideDetail?.iu_per_mg
    ? ["mcg", "mg", "IU"]
    : ["mcg", "mg"];

  const handleFieldChange = useCallback((mode, key, val) => {
    if (mode === "a") setModeAFields((prev) => ({ ...prev, [key]: val }));
    else setModeBFields((prev) => ({ ...prev, [key]: val }));
  }, []);

  // Recalculate whenever any input changes
  useEffect(() => {
    const vial = parseFloat(vialMg);
    if (!vial || vial <= 0) { setResult(null); setErrors([]); return; }

    const iu_per_mg = peptideDetail?.iu_per_mg ?? null;
    const def = peptideDetail ? protocolDefaultsFromPeptide(peptideDetail) : null;

    if (reconstituted) {
      // Mode A
      const { bacMl, targetDose, unit, syringeType } = modeAFields;
      const bac = parseFloat(bacMl);
      const rawDose = parseFloat(targetDose);
      if (!bac || bac <= 0 || !rawDose || rawDose <= 0) { setResult(null); setErrors([]); return; }

      let dose_mcg;
      try { dose_mcg = to_mcg(rawDose, unit, iu_per_mg); }
      catch (e) { setErrors([e.message]); setResult(null); return; }

      const r = calc_forward(vial, bac, dose_mcg, syringeType);
      if (!r.ok) { setErrors(r.errors); setResult(null); return; }

      setErrors([]);
      setResult({
        ok: true,
        mode: "forward",
        unit,
        ...r,
        syringe: {
          type: syringeType,
          capacity_units: { "U-100": 100, "U-50": 50, "U-40": 40 }[syringeType],
          draw_volume_ml: r.draw_volume_ml,
          draw_units: r.syringe_units,
        },
        concentration_label: `${r.concentration.toFixed(1)} mcg/mL`,
        target_dose_label: `${targetDose} ${unit}`,
        suggested_frequency: def?.suggested_frequency ?? null,
        warnings: r.warnings,
      });
    } else {
      // Mode B
      const { targetDose, unit, syringeType, preferredUnits } = modeBFields;
      const rawDose = parseFloat(targetDose);
      const desired = parseFloat(preferredUnits) || 20;
      if (!rawDose || rawDose <= 0) { setResult(null); setErrors([]); return; }

      let dose_mcg;
      try { dose_mcg = to_mcg(rawDose, unit, iu_per_mg); }
      catch (e) { setErrors([e.message]); setResult(null); return; }

      const r = calc_inverse(vial, dose_mcg, syringeType, desired);
      if (!r.ok) { setErrors(r.errors); setResult(null); return; }

      setErrors([]);
      setResult({
        ok: true,
        mode: "inverse",
        unit,
        ...r,
        syringe: {
          type: syringeType,
          capacity_units: { "U-100": 100, "U-50": 50, "U-40": 40 }[syringeType],
          draw_volume_ml: r.draw_volume_ml,
          draw_units: r.resulting_units_per_dose,
        },
        concentration_label: `${r.concentration.toFixed(1)} mcg/mL`,
        target_dose_label: `${targetDose} ${unit}`,
        recommended_water_ml: r.recommended_water_ml,
        alternatives: r.alternatives,
        suggested_frequency: def?.suggested_frequency ?? null,
        warnings: r.warnings,
      });
    }
  }, [vialMg, reconstituted, modeAFields, modeBFields, peptideDetail]);

  // Record usage after a valid result is produced
  useEffect(() => {
    if (!result?.ok) return;
    const record = async () => {
      try {
        const fp = await getFingerprint();
        const vial = parseFloat(vialMg);
        const bac = reconstituted ? parseFloat(modeAFields.bacMl) : result.recommended_water_ml;
        const dose_mcg = result.total_mcg ? (vial * 1000 / result.doses_per_vial) : undefined;
        await calculatorApi.recordUse({
          device_fingerprint: fp,
          platform: Platform.OS,
          peptide_name: peptideDetail?.name ?? peptideId ?? "Unknown",
          vial_mg: vial,
          bac_water_ml: bac ?? 0,
          target_mcg: result.concentration
            ? (parseFloat(result.target_dose_label) || 0)
            : 0,
          result_units: result.syringe?.draw_units ?? null,
          result_ml: result.syringe?.draw_volume_ml ?? null,
        });
        queryClient.invalidateQueries({ queryKey: ["calculator", "history"] });
        queryClient.invalidateQueries({ queryKey: ["calculator", "stats"] });
        onCalculated?.();
      } catch (_) {
        // recordUse is best-effort; never block the UI
      }
    };
    record();
    // Only fire once per stable result (compare by syringe units to avoid re-fire on unrelated state changes)
  }, [result?.syringe?.draw_units, result?.mode]);

  const suggestedRange = peptideDetail ? protocolDefaultsFromPeptide(peptideDetail) : null;

  return (
    <View>
      <ResearchBanner />

      <Text style={s.label}>Peptide</Text>
      <PeptideSelect selectedId={peptideId} onSelect={setPeptideId} />

      {/* Suggested range (if peptide selected and has dose data) */}
      {suggestedRange?.suggested_dose_low != null && (
        <View style={s.rangeHint}>
          <Text style={s.rangeHintText}>
            Reported range: {suggestedRange.suggested_dose_low}–{suggestedRange.suggested_dose_high} {suggestedRange.dose_unit}
            {suggestedRange.suggested_frequency ? `  ·  ${suggestedRange.suggested_frequency}` : ""}
          </Text>
          <Text style={s.rangeHintDisclaimer}>{suggestedRange.framing}</Text>
        </View>
      )}

      <Text style={s.label}>Vial Strength (mg)</Text>
      <VialStrengthInput value={vialMg} onChange={setVialMg} />

      <Text style={s.label}>Vial Status</Text>
      <ReconstitutedToggle value={reconstituted} onChange={(v) => {
        setReconstituted(v);
        setResult(null);
        setErrors([]);
      }} />

      {reconstituted ? (
        <ModeAFields
          fields={modeAFields}
          onChange={(k, v) => handleFieldChange("a", k, v)}
          availableUnits={availableUnits}
        />
      ) : (
        <ModeBFields
          fields={modeBFields}
          onChange={(k, v) => handleFieldChange("b", k, v)}
          availableUnits={availableUnits}
        />
      )}

      {errors.length > 0 && (
        <View style={s.errorBox}>
          {errors.map((e, i) => <Text key={i} style={s.errorText}>· {e}</Text>)}
        </View>
      )}

      <ResultsPanel result={result} peptideName={peptideDetail?.name} />
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    backgroundColor: "rgba(255,71,87,0.10)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,71,87,0.20)",
  },
  bannerText: {
    color: "#ff6b7a",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  label: {
    color: colors.tx2,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 18,
  },
  rangeHint: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "rgba(0,214,143,0.06)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,214,143,0.18)",
  },
  rangeHintText: { color: colors.teal, fontSize: 13 },
  rangeHintDisclaimer: { color: colors.tx3, fontSize: 11, marginTop: 3, fontStyle: "italic" },
  errorBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(255,71,87,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,71,87,0.25)",
  },
  errorText: { color: colors.red, fontSize: 13, marginBottom: 2 },
});
