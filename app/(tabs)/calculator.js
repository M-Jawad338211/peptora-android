import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { calculatorApi } from "../../src/api";
import { colors, fonts } from "../../src/lib/theme";
import { useAccess } from "../../src/lib/auth";
import { getFingerprint } from "../../src/lib/fingerprint";
import { amountFromMcg, dateTime, groupNum, parseNum, trimNum } from "../../src/lib/format";
import {
  calc_forward, dilution_note, dilution_options, mcg_from_units, to_mcg,
} from "../../src/lib/reconstitution";
import HoldButton from "../../src/components/HoldButton";
import VialSyringe from "../../src/components/VialSyringe";
import WarningsCallout from "../../src/components/WarningsCallout";

const SYRINGE = "U-100";
const SYRINGE_UNITS = 100;
const ISO_SYRINGE_URL = "https://www.iso.org/standard/60510.html";

function Field({ label, hint, value, onChangeText, placeholder, suffix, presets, onPreset, children }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputRow}>
        <TextInput
          style={[s.input, { flex: 1, minWidth: 0 }]}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.tx3}
          returnKeyType="done"
          accessibilityLabel={label}
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
        {children}
      </View>
      {presets?.length ? (
        <View style={s.presets}>
          {presets.map((p) => {
            const active = parseNum(value) === p.value;
            return (
              <TouchableOpacity
                key={p.label}
                style={[s.chip, active && s.chipActive]}
                onPress={() => onPreset(p.value)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

function ResultRow({ label, value, strong }) {
  return (
    <View style={s.resultRow}>
      <Text style={s.resultLabel}>{label}</Text>
      <Text style={[s.resultValue, strong && s.resultStrong]}>{value}</Text>
    </View>
  );
}

function Expander({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.card}>
      <TouchableOpacity
        style={s.expanderHead}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={s.cardTitle}>{title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={15} color={colors.tx3} />
      </TouchableOpacity>
      {open ? <View style={{ marginTop: 12 }}>{children}</View> : null}
    </View>
  );
}

export default function CalculatorTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, hasAccess } = useAccess();

  const [vialText, setVialText] = useState("");
  const [waterText, setWaterText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [unit, setUnit] = useState("mcg");
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const visual = useRef(null);

  const vial = parseNum(vialText);
  const water = parseNum(waterText);
  const amount = parseNum(amountText);

  const vialOk = vial > 0;
  const waterOk = water > 0;
  const amountOk = amount > 0;
  const amountMcg = amountOk ? to_mcg(amount, unit) : null;
  const concentration = vialOk && waterOk ? (vial * 1000) / water : null;

  const result = useMemo(() => {
    if (!vialOk || !waterOk || !amountOk) return null;
    const r = calc_forward(vial, water, amountMcg, SYRINGE);
    return r.ok ? r : null;
  }, [vialOk, waterOk, amountOk, vial, water, amountMcg]);

  // What each standard water volume would mean for the same amount. Offered
  // as a comparison, so it needs the vial and the amount but not the water.
  const comparison = useMemo(() => {
    if (!vialOk || !amountOk) return null;
    const d = dilution_options(vial, amountMcg, SYRINGE);
    return d.ok ? d : null;
  }, [vialOk, amountOk, vial, amountMcg]);

  // Dragging the plunger runs the conversion the other way: the syringe gives
  // the units, and the amount field follows.
  const onUnitsChange = (units) => {
    if (!concentration) return;
    const mcg = mcg_from_units(units, concentration, SYRINGE);
    if (mcg == null) return;
    setAmountText(amountFromMcg(mcg, unit));
  };

  const changeUnit = (next) => {
    if (next === unit) return;
    // Keep the same physical amount when the unit changes, rather than
    // reinterpreting "250" as milligrams.
    if (amountOk) setAmountText(amountFromMcg(to_mcg(amount, unit), next));
    setUnit(next);
  };

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["calculator", "history"],
    queryFn: () => calculatorApi.getHistory().then((r) => r.data.slice(0, 10)),
    enabled: !!user && hasAccess,
  });

  const requirePro = () => {
    if (!user) {
      router.push("/auth/signup");
      return false;
    }
    if (!hasAccess) {
      router.push("/paywall");
      return false;
    }
    return true;
  };

  const saveAsProtocol = () => {
    if (!result || !requirePro()) return;
    router.push({
      pathname: "/(tabs)/protocols",
      params: {
        calcVial: trimNum(vial, 3),
        calcWater: trimNum(water, 3),
        calcAmount: trimNum(amount, 4),
        calcUnit: unit,
        calcAt: String(Date.now()),
      },
    });
  };

  const saveToHistory = async () => {
    if (!result || saving || !requirePro()) return;
    setSaving(true);
    try {
      const fp = await getFingerprint();
      await calculatorApi.recordUse({
        device_fingerprint: fp,
        platform: Platform.OS,
        peptide_name: "Calculation",
        vial_mg: vial,
        bac_water_ml: water,
        target_mcg: amountMcg,
        result_units: result.syringe_units,
        result_ml: result.draw_volume_ml,
      });
      queryClient.invalidateQueries({ queryKey: ["calculator", "history"] });
    } catch {
      Alert.alert("Could not save", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const units = result ? result.syringe_units : null;
  const holdReady = !!result && units > 0 && units <= SYRINGE_UNITS;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEnabled={scrollEnabled}
    >
      <Text style={s.lead}>
        Arithmetic for a reconstituted vial. You enter every number, and
        Peptora converts between amount, volume and syringe units. It does
        not suggest how much to use.
      </Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>Your numbers</Text>
        <Field
          label="Vial amount"
          value={vialText}
          onChangeText={setVialText}
          placeholder="0"
          suffix="mg"
          presets={[{ label: "5 mg", value: 5 }, { label: "10 mg", value: 10 }, { label: "15 mg", value: 15 }]}
          onPreset={(v) => setVialText(String(v))}
        />
        <Field
          label="Water added"
          value={waterText}
          onChangeText={setWaterText}
          placeholder="0"
          suffix="mL"
          presets={[{ label: "1 mL", value: 1 }, { label: "2 mL", value: 2 }, { label: "3 mL", value: 3 }]}
          onPreset={(v) => setWaterText(String(v))}
        />
        <Field
          label="Amount to measure"
          hint="The amount you have already decided on. Peptora never fills this in for you."
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0"
        >
          <View style={s.unitChips}>
            {["mcg", "mg"].map((u) => (
              <TouchableOpacity
                key={u}
                style={[s.chip, s.unitChip, unit === u && s.chipActive]}
                onPress={() => changeUnit(u)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ checked: unit === u }}
              >
                <Text style={[s.chipText, unit === u && s.chipTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>
      </View>

      <View style={s.card}>
        <VialSyringe
          ref={visual}
          vialMg={vialOk ? vial : 0}
          waterMl={waterOk ? water : 0}
          units={units}
          maxUnits={SYRINGE_UNITS}
          onUnitsChange={onUnitsChange}
          onInteraction={(active) => setScrollEnabled(!active)}
          hint={
            concentration
              ? "Drag the plunger to read units back as an amount."
              : "Enter the vial amount and the water to set up the syringe."
          }
        />
        <HoldButton
          style={{ marginTop: 14 }}
          icon="water-outline"
          label="Hold to preview the draw"
          holdingLabel="Drawing"
          doneLabel={result ? `Drawn to ${trimNum(units, 1)} units` : "Done"}
          duration={1100}
          disabled={!holdReady}
          onProgress={(p) => visual.current?.setProgress(p)}
        />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Results</Text>
        <ResultRow
          label="Concentration"
          value={concentration ? `${groupNum(concentration, 1)} mcg/mL` : "Needs vial and water"}
        />
        <ResultRow
          label="Volume to draw"
          value={result ? `${result.draw_volume_ml.toFixed(3)} mL` : "Needs an amount"}
        />
        <ResultRow
          label={`Units on a ${SYRINGE} syringe`}
          value={result ? `${trimNum(result.syringe_units, 1)} units` : "Needs an amount"}
          strong
        />
        <ResultRow
          label="Draws of this size in the vial"
          value={result ? String(result.doses_per_vial) : "Needs an amount"}
        />
        <WarningsCallout warnings={result?.warnings} />
      </View>

      <Expander title="Show the working">
        {result ? (
          <>
            <Text style={s.working}>
              Concentration = {trimNum(vial, 3)} mg × 1,000 ÷ {trimNum(water, 3)} mL = {groupNum(concentration, 1)} mcg/mL
            </Text>
            <Text style={s.working}>
              Volume = {groupNum(amountMcg, 2)} mcg ÷ {groupNum(concentration, 1)} mcg/mL = {result.draw_volume_ml.toFixed(3)} mL
            </Text>
            <Text style={s.working}>
              Units = {result.draw_volume_ml.toFixed(3)} mL × 100 = {trimNum(result.syringe_units, 1)} units
            </Text>
          </>
        ) : (
          <>
            <Text style={s.working}>Concentration = vial amount ÷ water volume</Text>
            <Text style={s.working}>Volume = amount ÷ concentration</Text>
            <Text style={s.working}>Units = volume in mL × 100</Text>
          </>
        )}
        <Text style={s.note}>
          A U-100 syringe is marked so that 100 units equal 1 mL. That is the
          only conversion factor used here. Check every figure yourself before
          relying on it.
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL(ISO_SYRINGE_URL)} accessibilityRole="link">
          <Text style={s.link}>About insulin syringes: ISO 8537:2016</Text>
        </TouchableOpacity>
      </Expander>

      <Expander title="Compare water volumes">
        {comparison ? (
          <>
            <Text style={s.note}>
              The same amount in different volumes of water. More water spreads
              it over more units on the barrel. Tap a row to use that volume.
            </Text>
            {comparison.options.map((o) => {
              const active = waterOk && o.water_ml === water;
              const caution = dilution_note(o, SYRINGE);
              const easiest = o.water_ml === comparison.recommended_water_ml;
              return (
                <TouchableOpacity
                  key={o.water_ml}
                  style={[s.compareRow, active && s.compareRowActive]}
                  onPress={() => setWaterText(String(o.water_ml))}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.water_ml} millilitres gives ${trimNum(o.units_per_dose, 1)} units`}
                >
                  <Text style={[s.compareWater, active && { color: colors.teal }]}>{o.water_ml} mL</Text>
                  <Text style={s.compareUnits}>{trimNum(o.units_per_dose, 1)} units</Text>
                  <Text
                    style={[
                      s.compareNote,
                      (o.quality === "tiny" || o.quality === "over") && { color: colors.yellow },
                      !caution && easiest && { color: colors.teal },
                    ]}
                  >
                    {caution ?? (easiest ? "Easiest to read" : "")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <Text style={s.note}>Enter the vial amount and an amount to measure to compare volumes.</Text>
        )}
      </Expander>

      <View style={s.card}>
        <Text style={s.cardTitle}>Keep track of this vial</Text>
        <Text style={s.note}>
          Peptora Pro saves these numbers as a protocol, so each entry can be
          logged with one press and hold and your history stays with your
          account.
        </Text>
        <TouchableOpacity
          style={[s.primaryBtn, !result && s.btnDisabled]}
          onPress={saveAsProtocol}
          disabled={!result}
          activeOpacity={0.8}
        >
          <Ionicons name="flask-outline" size={16} color="#021a0e" />
          <Text style={s.primaryBtnText}>Save as protocol</Text>
        </TouchableOpacity>
        {user && hasAccess ? (
          <TouchableOpacity
            style={[s.secondaryBtn, (!result || saving) && s.btnDisabled]}
            onPress={saveToHistory}
            disabled={!result || saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color={colors.teal} size="small" />
              : <Text style={s.secondaryBtnText}>Save to history</Text>}
          </TouchableOpacity>
        ) : null}
      </View>

      {user && hasAccess ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Recent calculations</Text>
          {historyLoading ? (
            <ActivityIndicator color={colors.teal} style={{ marginTop: 12 }} />
          ) : history.length === 0 ? (
            <Text style={s.note}>Nothing saved yet.</Text>
          ) : (
            history.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.historyItem}
                activeOpacity={0.7}
                onPress={() => {
                  setVialText(trimNum(Number(item.vial_mg), 3));
                  setWaterText(trimNum(Number(item.bac_water_ml), 3));
                  setUnit("mcg");
                  setAmountText(trimNum(Number(item.target_mcg), 2));
                }}
                accessibilityRole="button"
                accessibilityLabel="Load these numbers"
              >
                <View style={s.historyTop}>
                  <Text style={s.historyTitle}>
                    {trimNum(Number(item.vial_mg), 3)} mg in {trimNum(Number(item.bac_water_ml), 3)} mL
                  </Text>
                  <Text style={s.historyDate}>{dateTime(item.created_at)}</Text>
                </View>
                <Text style={s.historyDetail}>
                  {[
                    `${trimNum(Number(item.target_mcg), 2)} mcg`,
                    item.result_ml != null ? `${Number(item.result_ml).toFixed(3)} mL` : null,
                    item.result_units != null ? `${trimNum(Number(item.result_units), 1)} units` : null,
                  ].filter(Boolean).join("  ·  ")}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : null}

      <Text style={s.disclaimer}>
        Peptora is a tracking and reference tool. It does not recommend doses
        and it is not medical advice. Talk to a qualified clinician about your
        own protocol.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  lead: { color: colors.tx2, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.tx,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  expanderHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  field: { marginTop: 14 },
  label: { color: colors.tx2, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.tx,
    fontSize: 17,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.mono,
  },
  suffix: { color: colors.tx2, fontSize: 15, fontWeight: "600", width: 34 },
  presets: { flexDirection: "row", gap: 8, marginTop: 8 },
  unitChips: { flexDirection: "row", gap: 6 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitChip: { paddingVertical: 11 },
  chipActive: { backgroundColor: "rgba(0,214,143,0.12)", borderColor: colors.teal },
  chipText: { color: colors.tx2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.teal },
  hint: { color: colors.tx3, fontSize: 12, lineHeight: 17, marginTop: 6 },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  resultLabel: { color: colors.tx2, fontSize: 14, flex: 1 },
  resultValue: { color: colors.tx, fontSize: 15, fontWeight: "700", fontFamily: fonts.mono },
  resultStrong: { color: colors.teal, fontSize: 17 },
  working: { color: colors.tx, fontSize: 13, lineHeight: 22, fontFamily: fonts.mono },
  note: { color: colors.tx2, fontSize: 13, lineHeight: 19, marginTop: 8 },
  link: { color: colors.teal, fontSize: 13, fontWeight: "600", marginTop: 10 },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  compareRowActive: { borderColor: colors.teal, backgroundColor: "rgba(0,214,143,0.08)" },
  compareWater: { color: colors.tx, fontSize: 14, fontWeight: "700", width: 62, fontFamily: fonts.mono },
  compareUnits: { color: colors.tx2, fontSize: 14, width: 84 },
  compareNote: { color: colors.tx3, fontSize: 12, flex: 1, textAlign: "right" },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: colors.teal,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: { color: "#021a0e", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { color: colors.teal, fontSize: 14, fontWeight: "600" },
  btnDisabled: { opacity: 0.45 },
  historyItem: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  historyTitle: { color: colors.tx, fontSize: 14, fontWeight: "600" },
  historyDate: { color: colors.tx3, fontSize: 12 },
  historyDetail: { color: colors.tx2, fontSize: 12 },
  disclaimer: { color: colors.tx3, fontSize: 12, textAlign: "center", marginTop: 12, lineHeight: 18 },
});
