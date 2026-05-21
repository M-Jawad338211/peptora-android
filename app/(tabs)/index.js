import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { calculatorApi } from "../../src/api";
import { colors } from "../../src/lib/theme";
import { useAuthSession } from "../../src/lib/auth";
import SyringeVisual from "../../src/components/SyringeVisual";
import { getFingerprint } from "../../src/lib/fingerprint";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const PEPTIDES = [
  "BPC-157",
  "TB-500",
  "GHK-Cu",
  "Ipamorelin",
  "CJC-1295 (no DAC)",
  "CJC-1295 (with DAC)",
  "GHRP-2",
  "GHRP-6",
  "Sermorelin",
  "Tesamorelin",
  "Semaglutide",
  "Tirzepatide",
  "Retatrutide",
  "AOD-9604",
  "Semax",
  "Selank",
  "Epitalon",
  "Thymosin Alpha-1",
  "MOTS-C",
  "SS-31",
  "KPV",
  "MK-677",
  "PT-141",
  "Melanotan II",
  "Custom",
];

function CalculatorContent() {
  const { user } = useAuthSession();
  const [peptide, setPeptide] = useState(PEPTIDES[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [vialMg, setVialMg] = useState("");
  const [bacMl, setBacMl] = useState("");
  const [targetMcg, setTargetMcg] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const res = await calculatorApi.getHistory();
      setHistory(res.data.slice(0, 10));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user?.is_admin) return;
    try {
      const res = await calculatorApi.getStats();
      setStats(res.data);
    } catch {
      setStats(null);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, [fetchHistory, fetchStats]);

  const calculate = async () => {
    if (!vialMg || !bacMl || !targetMcg) {
      Alert.alert("Missing values", "Please fill in all three fields");
      return;
    }
    setLoading(true);
    try {
      const vial = parseFloat(vialMg);
      const bac = parseFloat(bacMl);
      const target = parseFloat(targetMcg);
      const conc = (vial * 1000) / bac;
      const drawMl = target / conc;
      const drawUnits = drawMl * 100;
      const doses = Math.floor((vial * 1000) / target);
      setResult({
        drawMl: drawMl.toFixed(3),
        drawUnits: drawUnits.toFixed(1),
        doses,
        conc: conc.toFixed(0),
      });
      const fp = await getFingerprint();
      await calculatorApi
        .recordUse({
          device_fingerprint: fp,
          platform: Platform.OS,
          peptide_name: peptide,
          vial_mg: vial,
          bac_water_ml: bac,
          target_mcg: target,
          draw_ml: drawMl,
          result_ml: drawMl,
          result_units: parseFloat(drawUnits),
        })
        .catch(() => {});
      fetchHistory();
      fetchStats();
    } catch (e) {
      Alert.alert("Error", "Could not calculate. Check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      <View style={s.disclaimer}>
        <Text style={s.disclaimerText}>
          For research purposes only. Not medical advice.
        </Text>
      </View>

      <Text style={s.label}>Peptide</Text>
      <TouchableOpacity style={s.picker} onPress={() => setShowPicker(true)}>
        <Text style={s.pickerText}>{peptide}</Text>
        <Text style={s.pickerArrow}>▼</Text>
      </TouchableOpacity>

      <Text style={s.label}>Vial size (mg)</Text>
      <TextInput
        style={s.input}
        value={vialMg}
        onChangeText={setVialMg}
        keyboardType="decimal-pad"
        placeholder="e.g. 5"
        placeholderTextColor={colors.tx3}
      />

      <Text style={s.label}>BAC water added (mL)</Text>
      <TextInput
        style={s.input}
        value={bacMl}
        onChangeText={setBacMl}
        keyboardType="decimal-pad"
        placeholder="e.g. 2"
        placeholderTextColor={colors.tx3}
      />

      <Text style={s.label}>Target dose (mcg)</Text>
      <TextInput
        style={s.input}
        value={targetMcg}
        onChangeText={setTargetMcg}
        keyboardType="decimal-pad"
        placeholder="e.g. 250"
        placeholderTextColor={colors.tx3}
      />

      <TouchableOpacity
        style={[s.btn, loading && s.btnDisabled]}
        onPress={calculate}
        disabled={loading}
      >
        <Text style={s.btnText}>
          {loading ? "Calculating…" : "Calculate Dose"}
        </Text>
      </TouchableOpacity>

      {result && (
        <View style={s.result}>
          <Text style={s.resultTitle}>Your dose for {peptide}</Text>
          <View style={s.resultRow}>
            <Text style={s.resultLabel}>Draw volume</Text>
            <Text style={s.resultValue}>{result.drawMl} mL</Text>
          </View>
          <View style={s.resultRow}>
            <Text style={s.resultLabel}>Insulin units</Text>
            <Text style={s.resultValue}>{result.drawUnits} IU</Text>
          </View>
          <View style={s.resultRow}>
            <Text style={s.resultLabel}>Concentration</Text>
            <Text style={s.resultValue}>{result.conc} mcg/mL</Text>
          </View>
          <View style={s.resultRow}>
            <Text style={s.resultLabel}>Doses per vial</Text>
            <Text style={s.resultValue}>{result.doses}</Text>
          </View>
          <SyringeVisual units={parseFloat(result.drawUnits)} maxUnits={100} />
          <View style={s.guide}>
            <Text style={s.guideTitle}>Reconstitution guide</Text>
            <Text style={s.guideStep}>1. Wipe vial top with alcohol swab</Text>
            <Text style={s.guideStep}>
              2. Inject BAC water down inner wall slowly
            </Text>
            <Text style={s.guideStep}>3. Swirl gently — never shake</Text>
            <Text style={s.guideStep}>4. Store refrigerated at 2–8°C</Text>
            <Text style={s.guideStep}>
              5. Use within 30 days once reconstituted
            </Text>
          </View>
        </View>
      )}

      {/* Calculator Stats — admin only */}
      {stats && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Platform Stats</Text>
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{stats.calcs_today}</Text>
              <Text style={s.statLabel}>Today</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{stats.calcs_week}</Text>
              <Text style={s.statLabel}>This Week</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{stats.calcs_month}</Text>
              <Text style={s.statLabel}>This Month</Text>
            </View>
          </View>
          {stats.top_peptides?.length > 0 && (
            <View style={s.subSection}>
              <Text style={s.subSectionTitle}>Top Peptides</Text>
              {stats.top_peptides.slice(0, 5).map((item) => (
                <View key={item.peptide} style={s.statRow}>
                  <Text style={s.statRowLabel}>{item.peptide}</Text>
                  <Text style={s.statRowValue}>{item.count}</Text>
                </View>
              ))}
            </View>
          )}
          {stats.by_platform?.length > 0 && (
            <View style={s.subSection}>
              <Text style={s.subSectionTitle}>By Platform</Text>
              {stats.by_platform.map((item) => (
                <View key={item.platform} style={s.statRow}>
                  <Text style={s.statRowLabel}>{item.platform}</Text>
                  <Text style={s.statRowValue}>{item.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Calculation History */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Recent Calculations</Text>
        {!user ? (
          <Text style={s.gateText}>Log in to see your history</Text>
        ) : historyLoading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 12 }} />
        ) : history.length === 0 ? (
          <Text style={s.gateText}>No calculations yet</Text>
        ) : (
          history.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.historyItem}
              onPress={() => setSelectedHistoryItem(item)}
              activeOpacity={0.7}
            >
              <View style={s.historyTop}>
                <Text style={s.historyPeptide}>{item.peptide_name}</Text>
                <Text style={s.historyDate}>{formatDate(item.created_at)}</Text>
              </View>
              <View style={s.historyBottom}>
                <Text style={s.historyDetail}>Target: {item.target_mcg} mcg</Text>
                {item.result_ml != null && (
                  <Text style={s.historyDetail}>{item.result_ml.toFixed(3)} mL</Text>
                )}
                {item.result_units != null && (
                  <Text style={s.historyDetail}>{item.result_units.toFixed(1)} IU</Text>
                )}
              </View>
              <Text style={s.historyChevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* History detail modal */}
      <Modal
        visible={selectedHistoryItem != null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedHistoryItem(null)}
      >
        <View style={s.modalBg}>
          <View style={s.histDetailSheet}>
            <View style={s.histDetailHeader}>
              <Text style={s.histDetailTitle}>
                {selectedHistoryItem?.peptide_name}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedHistoryItem(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={s.histDetailClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedHistoryItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.histDetailDate}>
                  {formatDate(selectedHistoryItem.created_at)}
                </Text>
                <View style={s.resultRow}>
                  <Text style={s.resultLabel}>Draw volume</Text>
                  <Text style={s.resultValue}>
                    {selectedHistoryItem.result_ml != null
                      ? selectedHistoryItem.result_ml.toFixed(3)
                      : "—"}{" "}
                    mL
                  </Text>
                </View>
                <View style={s.resultRow}>
                  <Text style={s.resultLabel}>Insulin units</Text>
                  <Text style={s.resultValue}>
                    {selectedHistoryItem.result_units != null
                      ? selectedHistoryItem.result_units.toFixed(1)
                      : "—"}{" "}
                    IU
                  </Text>
                </View>
                {selectedHistoryItem.vial_mg != null &&
                  selectedHistoryItem.bac_water_ml != null && (
                    <View style={s.resultRow}>
                      <Text style={s.resultLabel}>Concentration</Text>
                      <Text style={s.resultValue}>
                        {(
                          (selectedHistoryItem.vial_mg * 1000) /
                          selectedHistoryItem.bac_water_ml
                        ).toFixed(0)}{" "}
                        mcg/mL
                      </Text>
                    </View>
                  )}
                {selectedHistoryItem.vial_mg != null &&
                  selectedHistoryItem.target_mcg != null && (
                    <View style={s.resultRow}>
                      <Text style={s.resultLabel}>Doses per vial</Text>
                      <Text style={s.resultValue}>
                        {Math.floor(
                          (selectedHistoryItem.vial_mg * 1000) /
                            selectedHistoryItem.target_mcg
                        )}
                      </Text>
                    </View>
                  )}
                <SyringeVisual
                  units={selectedHistoryItem.result_units ?? 0}
                  maxUnits={100}
                />
                <View style={s.guide}>
                  <Text style={s.guideTitle}>Reconstitution guide</Text>
                  <Text style={s.guideStep}>
                    1. Wipe vial top with alcohol swab
                  </Text>
                  <Text style={s.guideStep}>
                    2. Inject BAC water down inner wall slowly
                  </Text>
                  <Text style={s.guideStep}>3. Swirl gently — never shake</Text>
                  <Text style={s.guideStep}>4. Store refrigerated at 2–8°C</Text>
                  <Text style={s.guideStep}>
                    5. Use within 30 days once reconstituted
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Peptide picker modal */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Select Peptide</Text>
            <ScrollView>
              {PEPTIDES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={s.peptideRow}
                  onPress={() => {
                    setPeptide(p);
                    setShowPicker(false);
                  }}
                >
                  <Text
                    style={[
                      s.peptideItem,
                      p === peptide && s.peptideItemActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={s.modalClose}
              onPress={() => setShowPicker(false)}
            >
              <Text style={s.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default function CalculatorTab() {
  return <CalculatorContent />;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  disclaimer: {
    backgroundColor: "rgba(255,71,87,0.12)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  disclaimerText: {
    color: "#ff6b7a",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  label: {
    color: colors.tx2,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    color: colors.tx,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  picker: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerText: { color: colors.tx, fontSize: 16 },
  pickerArrow: { color: colors.tx3, fontSize: 12 },
  btn: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#021a0e", fontSize: 16, fontWeight: "700" },
  result: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "rgba(0,214,143,0.2)",
  },
  resultTitle: {
    color: colors.teal,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  resultLabel: { color: colors.tx2, fontSize: 14 },
  resultValue: { color: colors.tx, fontSize: 14, fontWeight: "600" },
  guide: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  guideTitle: {
    color: colors.tx2,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  guideStep: { color: colors.tx2, fontSize: 13, marginBottom: 4 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.navyLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "75%",
  },
  modalTitle: {
    color: colors.tx,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  peptideRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  peptideItem: { color: colors.tx, fontSize: 16 },
  peptideItemActive: { color: colors.teal, fontWeight: "700" },
  modalClose: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
  },
  modalCloseText: { color: colors.tx2, fontSize: 16 },

  // History & Stats
  section: {
    marginTop: 28,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.tx,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  gateText: {
    color: colors.tx3,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 8,
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(0,214,143,0.08)",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  statNum: { color: colors.teal, fontSize: 22, fontWeight: "800" },
  statLabel: { color: colors.tx2, fontSize: 11, fontWeight: "600", marginTop: 2, textTransform: "uppercase" },
  subSection: { marginTop: 14 },
  subSectionTitle: {
    color: colors.tx2,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statRowLabel: { color: colors.tx, fontSize: 13 },
  statRowValue: { color: colors.teal, fontSize: 13, fontWeight: "700" },

  // History
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "column",
  },
  historyTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  historyPeptide: { color: colors.tx, fontSize: 14, fontWeight: "600" },
  historyDate: { color: colors.tx3, fontSize: 12 },
  historyBottom: { flexDirection: "row", gap: 12 },
  historyDetail: { color: colors.tx2, fontSize: 12 },
  historyChevron: { position: "absolute", right: 0, top: "50%", color: colors.tx3, fontSize: 18 },

  // History detail modal
  histDetailSheet: {
    backgroundColor: colors.navyLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
  },
  histDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  histDetailTitle: {
    color: colors.teal,
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  histDetailClose: {
    color: colors.tx3,
    fontSize: 18,
    fontWeight: "600",
  },
  histDetailDate: {
    color: colors.tx3,
    fontSize: 12,
    marginBottom: 16,
  },
});
