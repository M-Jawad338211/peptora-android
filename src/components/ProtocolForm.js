import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";
import { encyclopediaApi, protocolsApi } from "../api";
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

const FREQUENCIES = [
  "Once daily", "Twice daily", "Three times daily",
  "Every other day", "Three times/week", "Twice weekly",
  "Weekly", "As needed",
];

function FrequencyPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={s.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={[s.pickerBtnText, !value && { color: colors.tx3 }]}>
          {value || "Select frequency…"}
        </Text>
        <Ionicons name="chevron-down" size={13} color={colors.tx3} />
      </TouchableOpacity>
      {open && (
        <View style={s.dropdownList}>
          {FREQUENCIES.map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.dropdownItem, f === value && s.dropdownItemActive]}
              onPress={() => { onChange(f); setOpen(false); }}
            >
              <Text style={[s.dropdownText, f === value && s.dropdownTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.dropdownItem} onPress={() => setOpen(false)}>
            <Text style={{ color: colors.tx3, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

export default function ProtocolForm({ onSaved, onCancel, initialPeptideId = null }) {
  const queryClient = useQueryClient();

  const [label, setLabel] = useState("");
  const [peptideId, setPeptideId] = useState(initialPeptideId);
  const [vialMg, setVialMg] = useState("");
  const [reconstituted, setReconstituted] = useState(true);
  const [modeAFields, setModeAFields] = useState(INITIAL_MODE_A);
  const [modeBFields, setModeBFields] = useState(INITIAL_MODE_B);
  const [frequency, setFrequency] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: peptideDetail } = useQuery({
    queryKey: ["peptide", peptideId],
    queryFn: () => encyclopediaApi.get(peptideId).then((r) => r.data),
    enabled: !!peptideId,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!peptideDetail) return;
    const def = protocolDefaultsFromPeptide(peptideDetail);
    setModeAFields((prev) => ({ ...prev, unit: def.dose_unit }));
    setModeBFields((prev) => ({ ...prev, unit: def.dose_unit }));
    if (!label) setLabel(peptideDetail.name || "");
    setResult(null);
    setErrors([]);
  }, [peptideDetail]);

  const availableUnits = peptideDetail?.iu_per_mg ? ["mcg", "mg", "IU"] : ["mcg", "mg"];

  const handleFieldChange = useCallback((mode, key, val) => {
    if (mode === "a") setModeAFields((prev) => ({ ...prev, [key]: val }));
    else setModeBFields((prev) => ({ ...prev, [key]: val }));
  }, []);

  useEffect(() => {
    const vial = parseFloat(vialMg);
    if (!vial || vial <= 0) { setResult(null); setErrors([]); return; }

    const iu_per_mg = peptideDetail?.iu_per_mg ?? null;
    const def = peptideDetail ? protocolDefaultsFromPeptide(peptideDetail) : null;

    if (reconstituted) {
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
        ok: true, mode: "forward", unit, ...r,
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
      const { targetDose, unit, syringeType, preferredUnits } = modeBFields;
      const rawDose = parseFloat(targetDose);
      const desired = parseFloat(preferredUnits) || 20;
      if (!rawDose || rawDose <= 0) { setResult(null); setErrors([]); return; }

      let dose_mcg;
      try { dose_mcg = to_mcg(rawDose, unit, iu_per_mg); }
      catch (e) { setErrors([e.message]); setResult(null); return; }

      const r = calc_inverse(vial, dose_mcg, "U-100", desired);
      if (!r.ok) { setErrors(r.errors); setResult(null); return; }

      setErrors([]);
      setResult({
        ok: true, mode: "inverse", unit, ...r,
        syringe: {
          type: "U-100",
          capacity_units: 100,
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

  const save = async () => {
    if (!label.trim()) { Alert.alert("Name required", "Give your protocol a name."); return; }
    if (!peptideId) { Alert.alert("Peptide required", "Select a peptide."); return; }
    const vial = parseFloat(vialMg);
    if (!vial || vial <= 0) { Alert.alert("Vial required", "Enter a valid vial strength."); return; }

    const fields = reconstituted ? modeAFields : modeBFields;
    const rawDose = parseFloat(fields.targetDose);
    if (!rawDose || rawDose <= 0) { Alert.alert("Dose required", "Enter a target dose."); return; }

    let dose_mcg;
    try {
      dose_mcg = to_mcg(rawDose, fields.unit, peptideDetail?.iu_per_mg ?? null);
    } catch (e) {
      Alert.alert("Unit error", e.message);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label: label.trim(),
        peptide_id: peptideId,
        peptide_name: peptideDetail?.name ?? null,
        vial_mg: vial,
        reconstituted,
        bac_water_ml: reconstituted ? parseFloat(modeAFields.bacMl) || null : null,
        target_dose_mcg: dose_mcg,
        unit: fields.unit,
        syringe_type: "U-100",
        frequency: frequency || null,
        duration_weeks: parseInt(durationWeeks) || null,
        notes: notes.trim() || null,
        status: "active",
      };
      const res = await protocolsApi.create(payload);
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
      queryClient.invalidateQueries({ queryKey: ["protocols", "stats"] });
      onSaved?.(res.data);
    } catch (e) {
      Alert.alert("Error", "Could not save protocol. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const suggestedRange = peptideDetail ? protocolDefaultsFromPeptide(peptideDetail) : null;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={s.header}>
        <Text style={s.title}>New Protocol</Text>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={colors.tx3} />
        </TouchableOpacity>
      </View>

      <View style={s.banner}>
        <Text style={s.bannerText}>For research and educational use only — not medical advice.</Text>
      </View>

      <Text style={s.label}>Protocol Name</Text>
      <TextInput
        style={s.input}
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. BPC-157 Healing Stack"
        placeholderTextColor={colors.tx3}
        maxLength={80}
      />

      <Text style={s.label}>Peptide</Text>
      <PeptideSelect selectedId={peptideId} onSelect={setPeptideId} />

      {suggestedRange?.suggested_dose_low != null && (
        <View style={s.rangeHint}>
          <Text style={s.rangeHintText}>
            Reported range: {suggestedRange.suggested_dose_low}–{suggestedRange.suggested_dose_high} {suggestedRange.dose_unit}
            {suggestedRange.suggested_frequency ? `  ·  ${suggestedRange.suggested_frequency}` : ""}
          </Text>
        </View>
      )}

      <Text style={s.label}>Vial Strength (mg)</Text>
      <VialStrengthInput value={vialMg} onChange={setVialMg} />

      <Text style={s.label}>Vial Status</Text>
      <ReconstitutedToggle value={reconstituted} onChange={(v) => {
        setReconstituted(v); setResult(null); setErrors([]);
      }} />

      {reconstituted ? (
        <ModeAFields fields={modeAFields} onChange={(k, v) => handleFieldChange("a", k, v)} availableUnits={availableUnits} />
      ) : (
        <ModeBFields fields={modeBFields} onChange={(k, v) => handleFieldChange("b", k, v)} availableUnits={availableUnits} />
      )}

      {errors.length > 0 && (
        <View style={s.errorBox}>
          {errors.map((e, i) => <Text key={i} style={s.errorText}>· {e}</Text>)}
        </View>
      )}

      <ResultsPanel result={result} peptideName={peptideDetail?.name} />

      <Text style={s.label}>Frequency</Text>
      <FrequencyPicker value={frequency} onChange={setFrequency} />

      <Text style={s.label}>Duration (weeks, optional)</Text>
      <TextInput
        style={s.input}
        value={durationWeeks}
        onChangeText={setDurationWeeks}
        placeholder="e.g. 12"
        placeholderTextColor={colors.tx3}
        keyboardType="number-pad"
        maxLength={3}
      />

      <Text style={s.label}>Notes (optional)</Text>
      <TextInput
        style={[s.input, s.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Goals, stacking notes, reminders…"
        placeholderTextColor={colors.tx3}
        multiline
        numberOfLines={3}
        maxLength={500}
      />

      <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={save} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#021a0e" />
          : <Text style={s.saveBtnText}>Save Protocol</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { color: colors.tx, fontSize: 20, fontWeight: "700" },
  banner: {
    backgroundColor: "rgba(255,71,87,0.08)",
    borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(255,71,87,0.18)",
  },
  bannerText: { color: "#ff6b7a", fontSize: 12, textAlign: "center", fontWeight: "500" },
  label: {
    color: colors.tx2, fontSize: 12, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.5,
    marginBottom: 6, marginTop: 18,
  },
  input: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 13,
    color: colors.tx, fontSize: 15, borderWidth: 1, borderColor: colors.border,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  rangeHint: {
    marginTop: 8, padding: 10,
    backgroundColor: "rgba(0,214,143,0.06)",
    borderRadius: 8, borderWidth: 1, borderColor: "rgba(0,214,143,0.18)",
  },
  rangeHintText: { color: colors.teal, fontSize: 13 },
  errorBox: {
    marginTop: 10, padding: 12,
    backgroundColor: "rgba(255,71,87,0.08)",
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,71,87,0.25)",
  },
  errorText: { color: colors.red, fontSize: 13, marginBottom: 2 },
  pickerBtn: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 13,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  pickerBtnText: { color: colors.tx, fontSize: 15 },
  dropdownList: {
    backgroundColor: colors.navyLight, borderRadius: 10,
    marginTop: 4, borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  dropdownItem: { paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemActive: { backgroundColor: "rgba(0,214,143,0.08)" },
  dropdownText: { color: colors.tx, fontSize: 15 },
  dropdownTextActive: { color: colors.teal, fontWeight: "700" },
  saveBtn: {
    backgroundColor: colors.teal, borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#021a0e", fontSize: 16, fontWeight: "700" },
});
