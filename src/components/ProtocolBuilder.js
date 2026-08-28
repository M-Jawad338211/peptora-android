import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { encyclopediaApi, calculatorApi } from "../api";
import { colors } from "../lib/theme";
import { getFingerprint } from "../lib/fingerprint";
import { calc_forward, to_mcg, dilution_options } from "../lib/reconstitution";
import { protocolDefaultsFromPeptide } from "../lib/peptideDefaults";
import PeptideSelect from "./PeptideSelect";
import VialStrengthInput from "./VialStrengthInput";
import ReconstitutedToggle from "./ReconstitutedToggle";
import ModeAFields from "./ModeAFields";
import ModeBFields from "./ModeBFields";
import ResultsPanel from "./ResultsPanel";

const INITIAL_MODE_A = { bacMl: "", targetDose: "", unit: "mcg", syringeType: "U-100" };
const INITIAL_MODE_B = { targetDose: "", unit: "mcg", syringeType: "U-100", dilutionMl: null };

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
  const [saving, setSaving] = useState(false);

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

  // Mode B's water options are derived, so the picker and the calculation
  // below can never disagree about which volume is selected.
  const dilution = useMemo(() => {
    if (reconstituted) return null;
    const vial = parseFloat(vialMg);
    const rawDose = parseFloat(modeBFields.targetDose);
    if (!vial || vial <= 0 || !rawDose || rawDose <= 0) return null;
    let mcg;
    try { mcg = to_mcg(rawDose, modeBFields.unit, peptideDetail?.iu_per_mg ?? null); }
    catch (_) { return null; }
    const d = dilution_options(vial, mcg, "U-100");
    return d.ok ? d : null;
  }, [reconstituted, vialMg, modeBFields.targetDose, modeBFields.unit, peptideDetail]);

  // A picked volume holds only while it is still on offer, and falls back to
  // the recommendation once a new dose pushes it off the list.
  const selectedWater = dilution
    ? (dilution.options.some((o) => o.water_ml === modeBFields.dilutionMl)
        ? modeBFields.dilutionMl
        : dilution.recommended_water_ml)
    : null;

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

      const r = calc_forward(vial, bac, dose_mcg, "U-100");
      if (!r.ok) { setErrors(r.errors); setResult(null); return; }

      setErrors([]);
      setResult({
        ok: true,
        mode: "forward",
        unit,
        ...r,
        syringe: {
          type: "U-100",
          capacity_units: 100,
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
      const { targetDose, unit } = modeBFields;
      const rawDose = parseFloat(targetDose);
      if (!rawDose || rawDose <= 0 || selectedWater == null) { setResult(null); setErrors([]); return; }

      let dose_mcg;
      try { dose_mcg = to_mcg(rawDose, unit, iu_per_mg); }
      catch (e) { setErrors([e.message]); setResult(null); return; }

      // Computed forward from the chosen volume, so the units shown on the
      // card are exactly the units in the result.
      const r = calc_forward(vial, selectedWater, dose_mcg, "U-100");
      if (!r.ok) { setErrors(r.errors); setResult(null); return; }

      setErrors([]);
      setResult({
        ok: true,
        mode: "inverse",
        unit,
        ...r,
        syringe: {
          type: "U-100",
          capacity_units: 100,
          draw_volume_ml: r.draw_volume_ml,
          draw_units: r.syringe_units,
        },
        concentration_label: `${r.concentration.toFixed(1)} mcg/mL`,
        target_dose_label: `${targetDose} ${unit}`,
        recommended_water_ml: selectedWater,
        suggested_frequency: def?.suggested_frequency ?? null,
        warnings: r.warnings,
      });
    }
  }, [vialMg, reconstituted, modeAFields, modeBFields, peptideDetail, selectedWater]);

  const saveCalculation = async () => {
    if (!result?.ok || saving) return;
    setSaving(true);
    try {
      const fp = await getFingerprint();
      const vial = parseFloat(vialMg);
      const bac = reconstituted ? parseFloat(modeAFields.bacMl) : selectedWater;
      await calculatorApi.recordUse({
        device_fingerprint: fp,
        platform: Platform.OS,
        peptide_name: peptideDetail?.name ?? peptideId ?? "Unknown",
        vial_mg: vial,
        bac_water_ml: bac ?? 0,
        target_mcg: result.syringe?.draw_units ?? 0,
        result_units: result.syringe?.draw_units ?? null,
        result_ml: result.syringe?.draw_volume_ml ?? null,
      });
      queryClient.invalidateQueries({ queryKey: ["calculator", "history"] });
      queryClient.invalidateQueries({ queryKey: ["calculator", "stats"] });
      onCalculated?.();
    } catch (_) {
      // best-effort
    } finally {
      setSaving(false);
    }
  };

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
          dilution={dilution}
          selectedWater={selectedWater}
        />
      )}

      {errors.length > 0 && (
        <View style={s.errorBox}>
          {errors.map((e, i) => <Text key={i} style={s.errorText}>· {e}</Text>)}
        </View>
      )}

      <ResultsPanel result={result} peptideName={peptideDetail?.name} />

      {result?.ok && (
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={saveCalculation}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#021a0e" size="small" />
            : <Text style={s.saveBtnText}>Save Calculation</Text>
          }
        </TouchableOpacity>
      )}
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
  saveBtn: {
    marginTop: 12,
    backgroundColor: colors.teal,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#021a0e", fontSize: 15, fontWeight: "700" },
});
