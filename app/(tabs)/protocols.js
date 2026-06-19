import { useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/lib/theme";
import { protocolsApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";
import ProtocolCard from "../../src/components/ProtocolCard";
import ProtocolForm from "../../src/components/ProtocolForm";
import ResultsPanel from "../../src/components/ResultsPanel";
import { calc_forward, calc_inverse } from "../../src/lib/reconstitution";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function days_since(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ── Calculation summary derived from saved protocol config ────────────────────

function CalcSummary({ protocol }) {
  const [expanded, setExpanded] = useState(false);

  let result = null;
  let err = null;
  try {
    // target_dose_mcg is already stored in mcg — no unit conversion needed
    const dose_mcg = parseFloat(protocol.target_dose_mcg);

    if (protocol.reconstituted && protocol.bac_water_ml) {
      const r = calc_forward(parseFloat(protocol.vial_mg), parseFloat(protocol.bac_water_ml), dose_mcg, "U-100");
      if (r.ok) result = { ...r, mode: "forward", unit: protocol.unit || "mcg" };
    } else if (!protocol.reconstituted) {
      const r = calc_inverse(parseFloat(protocol.vial_mg), dose_mcg, "U-100");
      if (r.ok) result = { ...r, mode: "inverse", unit: protocol.unit || "mcg" };
    }
  } catch (e) {
    err = e.message;
  }

  if (err || !result) {
    return (
      <View style={sd.calcBox}>
        <Text style={sd.calcTitle}>Calculation</Text>
        <Text style={sd.calcMuted}>{err || "Incomplete configuration — edit to recalculate."}</Text>
      </View>
    );
  }

  const drawUnits = result.syringe_units ?? result.resulting_units_per_dose ?? 0;
  const drawMl = result.draw_volume_ml ?? 0;
  const conc = result.concentration ?? 0;
  const doses = result.doses_per_vial ?? 0;

  const resultObj = {
    ok: true, mode: result.mode, unit: result.unit,
    doses_per_vial: result.doses_per_vial,
    concentration_label: `${conc.toFixed(1)} mcg/mL`,
    target_dose_label: `${parseFloat(protocol.target_dose_mcg).toFixed(1)} mcg`,
    recommended_water_ml: result.recommended_water_ml,
    alternatives: result.alternatives,
    syringe: {
      type: "U-100",
      capacity_units: 100,
      draw_volume_ml: drawMl,
      draw_units: drawUnits,
    },
    suggested_frequency: protocol.frequency ?? null,
    warnings: result.warnings,
  };

  return (
    <View style={sd.calcBox}>
      <TouchableOpacity style={sd.calcHeader} onPress={() => setExpanded((v) => !v)}>
        <Text style={sd.calcTitle}>Calculation</Text>
        <View style={sd.calcQuickStats}>
          <Text style={sd.calcStat}>{drawUnits.toFixed(1)} IU</Text>
          <Text style={sd.calcStatSep}>·</Text>
          <Text style={sd.calcStat}>{drawMl.toFixed(3)} mL</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.tx3} />
      </TouchableOpacity>
      {expanded && (
        <View style={{ marginTop: 12 }}>
          <ResultsPanel result={resultObj} peptideName={protocol.peptide_name} />
        </View>
      )}
    </View>
  );
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
  const [dose, setDose] = useState(
    protocol.target_dose_mcg
      ? `${parseFloat(protocol.target_dose_mcg).toFixed(1)} mcg`
      : ""
  );
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
    if (!dose.trim()) { Alert.alert("Dose required", "Enter the dose you took."); return; }
    setAdding(true);
    try {
      const res = await protocolsApi.addLog(protocol.id, {
        peptide_name: protocol.peptide_name || protocol.label || "Unknown",
        dose: dose.trim(),
        notes: notes.trim() || null,
        taken_at: takenAt.toISOString(),
      });
      queryClient.setQueryData(["protocol", protocol.id], (prev) => {
        if (!prev) return prev;
        return { ...prev, dose_logs: [res.data, ...(prev.dose_logs || [])] };
      });
      queryClient.invalidateQueries({ queryKey: ["protocols", "stats"] });
      setDose(protocol.target_dose_mcg ? `${parseFloat(protocol.target_dose_mcg).toFixed(1)} mcg` : "");
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
      <Text style={sd.logFormTitle}>Log a Dose</Text>
      <TextInput
        style={sd.logInput}
        value={dose}
        onChangeText={setDose}
        placeholder="Dose (e.g. 250 mcg)"
        placeholderTextColor={colors.tx3}
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
          : <Text style={sd.logBtnText}>+ Log Dose</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Protocol detail ───────────────────────────────────────────────────────────

function ProtocolDetail({ protocolId, onBack }) {
  const queryClient = useQueryClient();
  const [showLogForm, setShowLogForm] = useState(false);

  const { data: protocol, isLoading, error } = useQuery({
    queryKey: ["protocol", protocolId],
    queryFn: () => protocolsApi.get(protocolId).then((r) => r.data),
  });

  const deleteLog = (logId) => {
    Alert.alert("Delete log", "Remove this dose entry?", [
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
          } catch {
            Alert.alert("Error", "Could not delete entry.");
          }
        },
      },
    ]);
  };

  const changeStatus = async (newStatus) => {
    try {
      const res = await protocolsApi.update(protocolId, { status: newStatus });
      queryClient.setQueryData(["protocol", protocolId], (prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
    } catch {
      Alert.alert("Error", "Could not update status.");
    }
  };

  const deleteProtocol = () => {
    Alert.alert("Delete Protocol", "This will permanently delete the protocol and all its logs.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await protocolsApi.delete(protocolId);
            queryClient.invalidateQueries({ queryKey: ["protocols"] });
            queryClient.invalidateQueries({ queryKey: ["protocols", "stats"] });
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
        <Text style={sd.sectionTitle}>Cycle</Text>
        <View style={sd.cycleGrid}>
          {[
            { label: "Started", value: formatDateShort(protocol.start_date || protocol.created_at) },
            { label: "Day", value: daysSinceStart != null ? `#${daysSinceStart + 1}` : "—" },
            { label: "Duration", value: protocol.duration_weeks ? `${protocol.duration_weeks} wks` : "Open" },
            { label: "Frequency", value: protocol.frequency || "—" },
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

      {/* Calculation summary */}
      <CalcSummary protocol={protocol} />

      {/* Log dose */}
      <View style={sd.logSection}>
        <View style={sd.logHeader}>
          <Text style={sd.sectionTitle}>Dose Log ({logs.length})</Text>
          <TouchableOpacity
            style={sd.logToggle}
            onPress={() => setShowLogForm((v) => !v)}
          >
            <Ionicons name={showLogForm ? "close" : "add"} size={16} color={colors.teal} />
            <Text style={sd.logToggleText}>{showLogForm ? "Cancel" : "Log Dose"}</Text>
          </TouchableOpacity>
        </View>

        {showLogForm && (
          <DoseLogForm protocol={protocol} onLogged={() => setShowLogForm(false)} />
        )}

        {logs.length === 0 ? (
          <Text style={sd.emptyText}>No doses logged yet.</Text>
        ) : (
          logs.map((log) => (
            <TouchableOpacity
              key={log.id}
              style={sd.logEntry}
              onLongPress={() => deleteLog(log.id)}
              activeOpacity={0.8}
            >
              <View style={sd.logEntryRow}>
                <Text style={sd.logDose}>{log.dose}</Text>
                <Text style={sd.logDate}>{formatDate(log.taken_at)}</Text>
              </View>
              {log.notes ? <Text style={sd.logNotes}>{log.notes}</Text> : null}
            </TouchableOpacity>
          ))
        )}
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
            Create a protocol to track your peptide cycles, dosage calculations, and logs all in one place.
          </Text>
          <TouchableOpacity style={sl.emptyBtn} onPress={onNew}>
            <Text style={sl.emptyBtnText}>Create First Protocol</Text>
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
  const [view, setView] = useState("list"); // "list" | "detail" | "new"
  const [selectedId, setSelectedId] = useState(null);

  if (view === "new") {
    return (
      <ProtocolForm
        onSaved={() => setView("list")}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "detail" && selectedId) {
    return (
      <ProtocolDetail
        protocolId={selectedId}
        onBack={() => { setSelectedId(null); setView("list"); }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={sl.header}>
        <Text style={sl.headerTitle}>Protocols</Text>
        <TouchableOpacity
          style={sl.addBtn}
          onPress={() => setView("new")}
        >
          <Ionicons name="add" size={20} color="#021a0e" />
          <Text style={sl.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>
      <ProtocolList
        onSelect={(id) => { setSelectedId(id); setView("detail"); }}
        onNew={() => setView("new")}
      />
    </View>
  );
}

export default function ProtocolsTab() {
  return (
    <AuthGate
      title="Log in to use Protocols"
      subtitle="Create an account to save protocols, track doses, and monitor your cycles."
    >
      <ProtocolsContent />
    </AuthGate>
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
  emptyText: { color: colors.tx3, fontSize: 14, textAlign: "center", paddingVertical: 8 },
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
