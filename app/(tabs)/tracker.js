import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/lib/theme";
import { aiApi, trackerApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";

const PEPTIDES = [
  'BPC-157','TB-500','GHK-Cu','Ipamorelin','CJC-1295 (no DAC)',
  'CJC-1295 (with DAC)','GHRP-2','GHRP-6','Sermorelin','Tesamorelin',
  'Semaglutide','Tirzepatide','Retatrutide','AOD-9604','Semax',
  'Selank','Epitalon','Thymosin Alpha-1','MOTS-C','SS-31',
  'KPV','MK-677','PT-141','Melanotan II','Custom',
];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TrackerContent() {
  const queryClient = useQueryClient();
  const [peptide, setPeptide] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [dose, setDose] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Cached so switching tabs and coming back to the Tracker shows the log
  // immediately instead of a spinner.
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["tracker", "logs"],
    queryFn: () => trackerApi.getLogs().then((res) => res.data),
  });

  const addLog = async () => {
    if (!peptide || !dose) {
      Alert.alert("Missing fields", "Please select a peptide and enter a dose.");
      return;
    }
    setAdding(true);
    try {
      const res = await trackerApi.addLog(peptide, dose, notes);
      queryClient.setQueryData(["tracker", "logs"], (prev = []) => [res.data, ...prev]);
      setPeptide("");
      setDose("");
      setNotes("");
    } catch {
      Alert.alert("Error", "Could not save log entry. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const deleteLog = (id) => {
    Alert.alert("Delete entry", "Remove this log entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await trackerApi.deleteLog(id);
            queryClient.setQueryData(["tracker", "logs"], (prev = []) =>
              prev.filter((l) => l.id !== id),
            );
          } catch {
            Alert.alert("Error", "Could not delete entry.");
          }
        },
      },
    ]);
  };

  const getSummary = async () => {
    if (logs.length === 0) return;
    setSummaryLoading(true);
    try {
      const r = await aiApi.chat(
        `Give a brief weekly summary and observations for this peptide cycle log: ${JSON.stringify(logs)}`,
        [],
      );
      setSummary(r.data.reply || r.data.response || r.data.message || "");
    } catch {
      setSummary("Failed to get summary. Please try again.");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={s.title}>Cycle Tracker</Text>
      <Text style={s.subtitle}>
        Log your daily protocol and get AI-powered weekly summaries
      </Text>

      {/* Entry form */}
      <View style={s.form}>
        <TouchableOpacity style={s.picker} onPress={() => setShowPicker(true)}>
          <Text style={peptide ? s.pickerText : s.pickerPlaceholder}>
            {peptide || "Select peptide"}
          </Text>
          <Ionicons name="chevron-down" size={13} color={colors.tx3} />
        </TouchableOpacity>
        <TextInput
          style={s.input}
          value={dose}
          onChangeText={setDose}
          placeholder="Dose (e.g. 250 mcg)"
          placeholderTextColor={colors.tx3}
        />
        <TextInput
          style={[s.input, s.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.tx3}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity style={[s.addBtn, adding && s.addBtnDisabled]} onPress={addLog} disabled={adding}>
          {adding
            ? <ActivityIndicator color="#021a0e" />
            : <Text style={s.addBtnText}>+ Add Log Entry</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Log list */}
      <Text style={s.sectionTitle}>
        Log {logsLoading ? "" : `(${logs.length} entries)`}
      </Text>

      {logsLoading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: 16 }} />
      ) : logs.length === 0 ? (
        <Text style={s.emptyText}>No entries yet. Add your first dose above.</Text>
      ) : (
        <>
          {logs.map((log) => (
            <TouchableOpacity
              key={log.id}
              style={s.logCard}
              onLongPress={() => deleteLog(log.id)}
              activeOpacity={0.8}
            >
              <View style={s.logRow}>
                <Text style={s.logPeptide}>{log.peptide_name}</Text>
                <Text style={s.logDate}>{formatDate(log.taken_at)}</Text>
              </View>
              <Text style={s.logDose}>{log.dose}</Text>
              {log.notes ? <Text style={s.logNotes}>{log.notes}</Text> : null}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={s.summaryBtn}
            onPress={getSummary}
            disabled={summaryLoading}
          >
            {summaryLoading
              ? <ActivityIndicator color={colors.teal} />
              : <Text style={s.summaryBtnText}>Get AI Weekly Summary</Text>
            }
          </TouchableOpacity>
        </>
      )}

      {summary ? (
        <View style={s.summaryBox}>
          <Text style={s.summaryTitle}>AI Summary</Text>
          <Text style={s.summaryText}>{summary}</Text>
        </View>
      ) : null}

      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Select Peptide</Text>
            <ScrollView>
              {PEPTIDES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={s.peptideRow}
                  onPress={() => { setPeptide(p); setShowPicker(false); }}
                >
                  <Text style={[s.peptideItem, p === peptide && s.peptideItemActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.modalClose} onPress={() => setShowPicker(false)}>
              <Text style={s.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default function TrackerTab() {
  return (
    <AuthGate
      title="Log in to use the Cycle Tracker"
      subtitle="Create an account or log in to log doses and get AI weekly summaries."
    >
      <TrackerContent />
    </AuthGate>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  title: { color: colors.tx, fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: colors.tx2, fontSize: 14, marginBottom: 20 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.navy,
    borderRadius: 8,
    padding: 12,
    color: colors.tx,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  textArea: { height: 70, textAlignVertical: "top" },
  picker: {
    backgroundColor: colors.navy,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  pickerText: { color: colors.tx, fontSize: 14 },
  pickerPlaceholder: { color: colors.tx3, fontSize: 14 },
  pickerArrow: { color: colors.tx3, fontSize: 11 },
  addBtn: {
    backgroundColor: colors.teal,
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: "#021a0e", fontSize: 15, fontWeight: "700" },
  sectionTitle: {
    color: colors.tx2,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyText: { color: colors.tx3, fontSize: 14, textAlign: "center", marginTop: 8 },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  logPeptide: { color: colors.tx, fontSize: 15, fontWeight: "600" },
  logDate: { color: colors.tx3, fontSize: 12 },
  logDose: { color: colors.teal, fontSize: 13, marginBottom: 4 },
  logNotes: { color: colors.tx2, fontSize: 13 },
  summaryBtn: {
    backgroundColor: "rgba(0,214,143,0.12)",
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(0,214,143,0.3)",
  },
  summaryBtnText: { color: colors.teal, fontSize: 14, fontWeight: "600" },
  summaryBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(0,214,143,0.2)",
  },
  summaryTitle: { color: colors.teal, fontSize: 15, fontWeight: "700", marginBottom: 10 },
  summaryText: { color: colors.tx, fontSize: 14, lineHeight: 22 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.navyLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "75%",
  },
  modalTitle: { color: colors.tx, fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  peptideRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  peptideItem: { color: colors.tx, fontSize: 16 },
  peptideItemActive: { color: colors.teal, fontWeight: "700" },
  modalClose: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 12 },
  modalCloseText: { color: colors.tx2, fontSize: 16 },
});
