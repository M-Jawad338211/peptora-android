import { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/lib/theme";
import { protocolsApi } from "../../src/api";
import { FEATURES } from "../../src/lib/config";
import { amountFromMcg, dateOnly, dateTime, groupNum, trimNum } from "../../src/lib/format";
import HoldButton from "../../src/components/HoldButton";
import ProGate from "../../src/components/ProGate";
import ProtocolCard from "../../src/components/ProtocolCard";
import ProtocolForm from "../../src/components/ProtocolForm";
import ResultsPanel from "../../src/components/ResultsPanel";
import { calc_forward } from "../../src/lib/reconstitution";

const NONE = "Not set";

function formatDate(iso) {
  return iso ? dateTime(iso) : NONE;
}

function formatDateShort(iso) {
  return iso ? dateOnly(iso) : NONE;
}

/** The protocol's own dose, written the way the user entered it. */
function doseLabel(protocol) {
  const mcg = parseFloat(protocol.target_dose_mcg);
  if (!(mcg > 0)) return "";
  const unit = protocol.unit === "mg" ? "mg" : "mcg";
  return `${amountFromMcg(mcg, unit)} ${unit}`;
}

/** Newest first, by when the entry says it happened (it can be backdated). */
function newestFirst(logs) {
  return [...logs].sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at));
}

function days_since(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ── Calculation derived from the saved protocol ──────────────────────────────

/**
 * Work the protocol's saved numbers through the same arithmetic as the
 * calculator. Returns null when the protocol has no water volume yet.
 */
function protocolResult(protocol) {
  if (!FEATURES.calculator) return null;
  const vial = parseFloat(protocol.vial_mg);
  const water = parseFloat(protocol.bac_water_ml);
  // target_dose_mcg is already stored in mcg, so no unit conversion is needed.
  const dose_mcg = parseFloat(protocol.target_dose_mcg);
  if (!(vial > 0) || !(water > 0) || !(dose_mcg > 0)) return null;

  const r = calc_forward(vial, water, dose_mcg, "U-100");
  if (!r.ok) return null;
  return {
    ok: true,
    mode: protocol.reconstituted ? "forward" : "inverse",
    unit: protocol.unit || "mcg",
    doses_per_vial: r.doses_per_vial,
    concentration_label: `${groupNum(r.concentration, 1)} mcg/mL`,
    target_dose_label: doseLabel(protocol),
    recommended_water_ml: protocol.reconstituted ? undefined : water,
    vial_mg: vial,
    water_ml: water,
    syringe: {
      type: "U-100",
      capacity_units: 100,
      draw_volume_ml: r.draw_volume_ml,
      draw_units: r.syringe_units,
    },
    warnings: r.warnings,
  };
}

// ── Dose log form ─────────────────────────────────────────────────────────────

const AGO_OPTS = [
  { label: "Now", minutes: 0 },
  { label: "30m ago", minutes: 30 },
  { label: "1h ago", minutes: 60 },
  { label: "2h ago", minutes: 120 },
  { label: "3h ago", minutes: 180 },
];

function fmtTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function DoseLogForm({ protocol, onLogged }) {
  const queryClient = useQueryClient();
  const [dose, setDose] = useState(doseLabel(protocol));
  const [notes, setNotes] = useState("");
  const [selectedAgo, setSelectedAgo] = useState(0);
  const [takenAt, setTakenAt] = useState(new Date());
  const [adding, setAdding] = useState(false);

  const pickAgo = (minutes) => {
    setSelectedAgo(minutes);
    const d = new Date();
    d.setMinutes(d.getMinutes() - minutes);
    setTakenAt(d);
  };

  const addLog = async () => {
    if (!dose.trim()) { Alert.alert("Amount required", "Enter what you are logging."); return; }
    setAdding(true);
    try {
      const res = await protocolsApi.addLog(protocol.id, {
        peptide_name: protocol.peptide_name || protocol.stack_name || protocol.label || "Protocol",
        dose: dose.trim(),
        notes: notes.trim() || null,
        taken_at: takenAt.toISOString(),
      });
      queryClient.setQueryData(["protocol", protocol.id], (prev) => {
        if (!prev) return prev;
        return { ...prev, dose_logs: newestFirst([res.data, ...(prev.dose_logs || [])]) };
      });
      queryClient.invalidateQueries({ queryKey: ["protocols", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["tracker", "logs"] });
      setDose(doseLabel(protocol));
      setNotes("");
      setSelectedAgo(0);
      setTakenAt(new Date());
      onLogged?.();
    } catch {
      Alert.alert("Error", "Could not save log. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={sd.logForm}>
      <Text style={sd.logFormTitle}>Log with details</Text>
      <TextInput
        style={sd.logInput}
        value={dose}
        onChangeText={setDose}
        placeholder="Amount and unit"
        placeholderTextColor={colors.tx3}
        accessibilityLabel="Amount and unit"
      />

      <Text style={sd.logTimeLabel}>When? <Text style={sd.logTimeCurrent}>({fmtTime(takenAt)})</Text></Text>
      <View style={sd.agoRow}>
        {AGO_OPTS.map(({ label, minutes }) => (
          <TouchableOpacity
            key={label}
            style={[sd.agoChip, selectedAgo === minutes && sd.agoChipActive]}
            onPress={() => pickAgo(minutes)}
          >
            <Text style={[sd.agoChipText, selectedAgo === minutes && sd.agoChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={[sd.logInput, { height: 60, textAlignVertical: "top" }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.tx3}
        multiline
      />
      <TouchableOpacity style={[sd.logBtn, adding && { opacity: 0.6 }]} onPress={addLog} disabled={adding}>
        {adding
          ? <ActivityIndicator color="#021a0e" size="small" />
          : <Text style={sd.logBtnText}>Save entry</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Protocol detail ───────────────────────────────────────────────────────────

function ProtocolDetail({ protocolId, onBack }) {
  const queryClient = useQueryClient();
  const [showLogForm, setShowLogForm] = useState(false);
  const [quickLogging, setQuickLogging] = useState(false);
  const visual = useRef(null);

  const { data: protocol, isLoading, error } = useQuery({
    queryKey: ["protocol", protocolId],
    queryFn: () => protocolsApi.get(protocolId).then((r) => r.data),
  });

  // One press and hold: log the protocol's own dose, timed now.
  const quickLog = async (protocol) => {
    if (quickLogging) return;
    setQuickLogging(true);
    try {
      const res = await protocolsApi.addLog(protocol.id, {
        peptide_name: protocol.peptide_name || protocol.stack_name || protocol.label || "Protocol",
        dose: doseLabel(protocol),
        notes: null,
        taken_at: new Date().toISOString(),
      });
      queryClient.setQueryData(["protocol", protocol.id], (prev) => {
        if (!prev) return prev;
        return { ...prev, dose_logs: newestFirst([res.data, ...(prev.dose_logs || [])]) };
      });
      queryClient.invalidateQueries({ queryKey: ["protocols", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["tracker", "logs"] });
    } catch {
      Alert.alert("Not saved", "The entry could not be saved. Check your connection and try again.");
    } finally {
      setQuickLogging(false);
    }
  };

  const deleteLog = (logId) => {
    Alert.alert("Delete entry", "Remove this log entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await protocolsApi.deleteLog(protocolId, logId);
            queryClient.setQueryData(["protocol", protocolId], (prev) => {
              if (!prev) return prev;
              return { ...prev, dose_logs: (prev.dose_logs || []).filter((l) => l.id !== logId) };
            });
            queryClient.invalidateQueries({ queryKey: ["protocols", "stats"] });
            queryClient.invalidateQueries({ queryKey: ["tracker", "logs"] });
          } catch {
            Alert.alert("Error", "Could not delete entry.");
          }
        },
      },
    ]);
  };

  const changeStatus = async (newStatus) => {
    try {
      await protocolsApi.update(protocolId, { status: newStatus });
      queryClient.setQueryData(["protocol", protocolId], (prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
    } catch {
      Alert.alert("Error", "Could not update status.");
    }
  };

  const deleteProtocol = () => {
    Alert.alert("Delete protocol", "This permanently deletes the protocol and all of its log entries.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await protocolsApi.delete(protocolId);
            queryClient.invalidateQueries({ queryKey: ["protocols"] });
            queryClient.invalidateQueries({ queryKey: ["tracker", "logs"] });
            onBack();
          } catch {
            Alert.alert("Error", "Could not delete protocol.");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={sd.centered}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (error || !protocol) {
    return (
      <View style={sd.centered}>
        <Text style={sd.errorText}>Could not load protocol.</Text>
        <TouchableOpacity style={sd.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={14} color={colors.teal} />
          <Text style={sd.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysSinceStart = days_since(protocol.start_date || protocol.created_at);
  const logs = protocol.dose_logs || [];
  const result = protocolResult(protocol);
  const dose = doseLabel(protocol);
  const STATUS_ACTIONS = [
    { label: "Active", value: "active" },
    { label: "Paused", value: "paused" },
    { label: "Completed", value: "completed" },
  ];
  const STATUS_COLOR = { active: colors.teal, paused: colors.yellow, completed: colors.tx3 };

  return (
    <ScrollView style={sd.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Header */}
      <TouchableOpacity style={sd.backRow} onPress={onBack}>
        <Ionicons name="arrow-back" size={14} color={colors.teal} />
        <Text style={sd.backText}>Protocols</Text>
      </TouchableOpacity>

      <View style={sd.titleRow}>
        <Text style={sd.detailTitle}>{protocol.label || protocol.peptide_name || "Protocol"}</Text>
        <TouchableOpacity onPress={deleteProtocol} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
        </TouchableOpacity>
      </View>

      {protocol.peptide_name && protocol.label !== protocol.peptide_name && (
        <Text style={sd.detailSub}>{protocol.peptide_name}</Text>
      )}

      {/* Status chips */}
      <View style={sd.statusRow}>
        {STATUS_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.value}
            style={[
              sd.statusChip,
              protocol.status === a.value && { backgroundColor: STATUS_COLOR[a.value] + "22", borderColor: STATUS_COLOR[a.value] + "66" },
            ]}
            onPress={() => protocol.status !== a.value && changeStatus(a.value)}
          >
            <Text style={[sd.statusChipText, protocol.status === a.value && { color: STATUS_COLOR[a.value], fontWeight: "700" }]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cycle info */}
      <View style={sd.cycleCard}>
        <Text style={sd.sectionTitle}>Schedule</Text>
        <View style={sd.cycleGrid}>
          {[
            { label: "Started", value: formatDateShort(protocol.start_date || protocol.created_at) },
            { label: "Day", value: daysSinceStart != null ? String(daysSinceStart + 1) : NONE },
            { label: "Duration", value: protocol.duration_weeks ? `${protocol.duration_weeks} weeks` : "Open" },
            { label: "Frequency", value: protocol.frequency || NONE },
          ].map(({ label, value }) => (
            <View key={label} style={sd.cycleCell}>
              <Text style={sd.cycleCellLabel}>{label}</Text>
              <Text style={sd.cycleCellValue}>{value}</Text>
            </View>
          ))}
        </View>
        {protocol.notes ? (
          <View style={sd.notesBox}>
            <Text style={sd.notesText}>{protocol.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* The worked numbers, with the vial and syringe */}
      {result ? (
        <ResultsPanel
          ref={visual}
          result={result}
          peptideName={protocol.peptide_name || protocol.stack_name}
          style={sd.results}
        />
      ) : FEATURES.calculator ? (
        <View style={sd.calcBox}>
          <Text style={sd.calcTitle}>Calculation</Text>
          <Text style={sd.calcMuted}>This protocol has no water volume saved, so there is nothing to work out.</Text>
        </View>
      ) : (
        // No calculator in this build: the numbers are shown as they were entered.
        <View style={sd.cycleCard}>
          <Text style={sd.sectionTitle}>Vial</Text>
          <View style={sd.cycleGrid}>
            {[
              { label: "Vial amount", value: parseFloat(protocol.vial_mg) > 0 ? `${trimNum(parseFloat(protocol.vial_mg), 3)} mg` : NONE },
              { label: "Water added", value: parseFloat(protocol.bac_water_ml) > 0 ? `${trimNum(parseFloat(protocol.bac_water_ml), 3)} mL` : NONE },
              { label: "Your dose", value: dose || NONE },
            ].map(({ label, value }) => (
              <View key={label} style={sd.cycleCell}>
                <Text style={sd.cycleCellLabel}>{label}</Text>
                <Text style={sd.cycleCellValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Log */}
      <View style={sd.logSection}>
        <View style={sd.logHeader}>
          <Text style={sd.sectionTitle}>Log ({logs.length})</Text>
          <TouchableOpacity
            style={sd.logToggle}
            onPress={() => setShowLogForm((v) => !v)}
          >
            <Ionicons name={showLogForm ? "close" : "create-outline"} size={15} color={colors.teal} />
            <Text style={sd.logToggleText}>{showLogForm ? "Cancel" : "Add details"}</Text>
          </TouchableOpacity>
        </View>

        {!showLogForm && (
          <>
            <HoldButton
              icon="checkmark-circle-outline"
              label={dose ? `Hold to log ${dose}` : "Hold to log"}
              holdingLabel="Keep holding"
              doneLabel="Logged"
              busy={quickLogging}
              onProgress={(p) => visual.current?.setProgress(p)}
              onComplete={() => quickLog(protocol)}
            />
            <Text style={sd.holdHint}>
              Logs your own dose at the current time. Use Add details for a different amount, time or a note.
            </Text>
          </>
        )}

        {showLogForm && (
          <DoseLogForm protocol={protocol} onLogged={() => setShowLogForm(false)} />
        )}

        {logs.length === 0 ? (
          <Text style={sd.emptyText}>Nothing logged yet.</Text>
        ) : (
          logs.map((log) => (
            <TouchableOpacity
              key={log.id}
              style={sd.logEntry}
              onLongPress={() => deleteLog(log.id)}
              activeOpacity={0.8}
              accessibilityHint="Press and hold to delete this entry"
            >
              <View style={sd.logEntryRow}>
                <Text style={sd.logDose}>{log.dose}</Text>
                <Text style={sd.logDate}>{formatDate(log.taken_at)}</Text>
              </View>
              {log.notes ? <Text style={sd.logNotes}>{log.notes}</Text> : null}
            </TouchableOpacity>
          ))
        )}
        {logs.length > 0 && <Text style={sd.holdHint}>Press and hold an entry to delete it.</Text>}
      </View>

    </ScrollView>
  );
}

// ── Protocol list ─────────────────────────────────────────────────────────────

function ProtocolList({ onSelect, onNew }) {
  const { data: protocols = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["protocols"],
    queryFn: () => protocolsApi.list().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <View style={sl.centered}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (error && protocols.length === 0) {
    return (
      <View style={sl.centered}>
        <Text style={sl.errorText}>Could not load protocols.</Text>
        <TouchableOpacity style={sl.retryBtn} onPress={refetch}>
          <Text style={sl.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={sl.container} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
      {protocols.length === 0 ? (
        <View style={sl.emptyState}>
          <Ionicons name="flask-outline" size={52} color={colors.tx3} />
          <Text style={sl.emptyTitle}>No protocols yet</Text>
          <Text style={sl.emptySubtitle}>
            A protocol holds one vial, the schedule you have set for it, and its log.
          </Text>
          <TouchableOpacity style={sl.emptyBtn} onPress={onNew}>
            <Text style={sl.emptyBtnText}>Create a protocol</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {protocols.map((p) => (
            <ProtocolCard
              key={p.id}
              protocol={p}
              onPress={() => onSelect(p.id)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ── Main Protocols tab ────────────────────────────────────────────────────────

function ProtocolsContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Set by "Add as protocol" on a library entry and by "Save as protocol" in
  // the calculator, so the form arrives prefilled instead of blank.
  const params = useLocalSearchParams();
  const { newPeptideId, newStackId, calcVial, calcWater, calcAmount, calcUnit, calcAt } = params;

  const [view, setView] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);

  // This tab stays mounted, so the params have to be watched rather than read
  // once: the second "Add as protocol" of a session used to land on the list.
  useEffect(() => {
    if (!newPeptideId && !newStackId && !calcAt) return;
    setDraft({
      key: `${newPeptideId ?? ""}|${newStackId ?? ""}|${calcAt ?? ""}`,
      peptideId: newPeptideId ?? null,
      stackId: newStackId ?? null,
      values: calcAt
        ? { vialMg: calcVial ?? "", waterMl: calcWater ?? "", amount: calcAmount ?? "", unit: calcUnit === "mg" ? "mg" : "mcg" }
        : null,
    });
    setSelectedId(null);
    setView("new");
    // Used up: clear them so coming back to this tab later shows the list.
    router.setParams({
      newPeptideId: undefined, newStackId: undefined,
      calcVial: undefined, calcWater: undefined, calcAmount: undefined, calcUnit: undefined, calcAt: undefined,
    });
  }, [newPeptideId, newStackId, calcAt]);

  const closeForm = () => {
    setDraft(null);
    setView("list");
  };

  if (view === "new") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy, paddingTop: insets.top }}>
        <ProtocolForm
          key={draft?.key ?? "blank"}
          initialPeptideId={draft?.peptideId ?? null}
          initialStackId={draft?.stackId ?? null}
          initialValues={draft?.values ?? null}
          onSaved={closeForm}
          onCancel={closeForm}
        />
      </View>
    );
  }

  if (view === "detail" && selectedId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy, paddingTop: insets.top }}>
        <ProtocolDetail
          protocolId={selectedId}
          onBack={() => { setSelectedId(null); setView("list"); }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy, paddingTop: insets.top }}>
      <View style={sl.header}>
        <Text style={sl.headerTitle}>Protocols</Text>
        <TouchableOpacity
          style={sl.addBtn}
          onPress={() => { setDraft(null); setView("new"); }}
        >
          <Ionicons name="add" size={20} color="#021a0e" />
          <Text style={sl.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>
      <ProtocolList
        onSelect={(id) => { setSelectedId(id); setView("detail"); }}
        onNew={() => { setDraft(null); setView("new"); }}
      />
    </View>
  );
}

export default function ProtocolsTab() {
  return (
    <ProGate
      authTitle="Log in to use Protocols"
      authSubtitle="Create an account to save protocols, log entries and keep your history."
    >
      <ProtocolsContent />
    </ProGate>
  );
}

// ── Detail styles ─────────────────────────────────────────────────────────────

const sd = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  centered: { flex: 1, backgroundColor: colors.navy, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { color: colors.red, fontSize: 15, textAlign: "center", marginBottom: 16 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { color: colors.teal, fontWeight: "600", fontSize: 14 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  detailTitle: { color: colors.tx, fontSize: 22, fontWeight: "800", flex: 1, marginRight: 12 },
  detailSub: { color: colors.tx2, fontSize: 14, marginBottom: 14 },
  statusRow: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 18 },
  statusChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  statusChipText: { color: colors.tx2, fontSize: 13 },
  sectionTitle: {
    color: colors.tx2, fontSize: 12, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12,
  },
  cycleCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  cycleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  cycleCell: { width: "50%", paddingBottom: 12 },
  cycleCellLabel: { color: colors.tx3, fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  cycleCellValue: { color: colors.tx, fontSize: 15, fontWeight: "600" },
  notesBox: {
    marginTop: 8, padding: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  notesText: { color: colors.tx2, fontSize: 13, lineHeight: 19 },
  calcBox: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  results: { marginTop: 0, marginBottom: 12 },
  calcHeader: { flexDirection: "row", alignItems: "center" },
  calcTitle: { color: colors.tx2, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 },
  calcQuickStats: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: 10 },
  calcStat: { color: colors.teal, fontSize: 13, fontWeight: "700" },
  calcStatSep: { color: colors.tx3, fontSize: 13 },
  calcMuted: { color: colors.tx3, fontSize: 13, marginTop: 6 },
  logSection: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  logHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  logToggle: { flexDirection: "row", alignItems: "center", gap: 4 },
  logToggleText: { color: colors.teal, fontSize: 14, fontWeight: "600" },
  logForm: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10,
    padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  logFormTitle: { color: colors.tx2, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  logTimeLabel: { color: colors.tx3, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  logTimeCurrent: { color: colors.tx2, fontWeight: "400", textTransform: "none" },
  agoRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  agoChip: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.04)",
  },
  agoChipActive: { backgroundColor: "rgba(0,214,143,0.12)", borderColor: colors.teal },
  agoChipText: { color: colors.tx2, fontSize: 12, fontWeight: "600" },
  agoChipTextActive: { color: colors.teal },
  logInput: {
    backgroundColor: colors.navy, borderRadius: 8, padding: 12,
    color: colors.tx, fontSize: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  logBtn: {
    backgroundColor: colors.teal, borderRadius: 8, padding: 12, alignItems: "center",
  },
  logBtnText: { color: "#021a0e", fontSize: 14, fontWeight: "700" },
  emptyText: { color: colors.tx3, fontSize: 14, textAlign: "center", paddingVertical: 12 },
  holdHint: { color: colors.tx3, fontSize: 12, lineHeight: 17, marginTop: 8, textAlign: "center" },
  logEntry: {
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logEntryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  logDose: { color: colors.teal, fontSize: 14, fontWeight: "600" },
  logDate: { color: colors.tx3, fontSize: 12 },
  logNotes: { color: colors.tx2, fontSize: 13 },
});

// ── List styles ───────────────────────────────────────────────────────────────

const sl = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  centered: { flex: 1, backgroundColor: colors.navy, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { color: colors.red, fontSize: 15, textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.teal, fontWeight: "600" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    backgroundColor: colors.navy,
  },
  headerTitle: { color: colors.tx, fontSize: 24, fontWeight: "800" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.teal, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: "#021a0e", fontSize: 14, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { color: colors.tx, fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: colors.tx2, fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: colors.teal, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  emptyBtnText: { color: "#021a0e", fontSize: 15, fontWeight: "700" },
});
