import { useState } from "react";
import {
  View, Text, ScrollView, Modal, ActivityIndicator, TouchableOpacity, StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { calculatorApi } from "../../src/api";
import { colors } from "../../src/lib/theme";
import { useAuthSession } from "../../src/lib/auth";
import SyringeVisual from "../../src/components/SyringeVisual";
import ProtocolBuilder from "../../src/components/ProtocolBuilder";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CalculatorTab() {
  const { user } = useAuthSession();
  const [historyVersion, setHistoryVersion] = useState(0);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["calculator", "history", historyVersion],
    queryFn: () => calculatorApi.getHistory().then((r) => r.data.slice(0, 10)),
    enabled: !!user,
  });

  const { data: stats = null } = useQuery({
    queryKey: ["calculator", "stats"],
    queryFn: () => calculatorApi.getStats().then((r) => r.data),
    enabled: !!user?.is_admin,
  });

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      {/* Protocol Builder — no auth gate; works anonymously with trial limits */}
      <ProtocolBuilder onCalculated={() => setHistoryVersion((v) => v + 1)} />

      {/* Admin stats */}
      {stats && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Platform Stats</Text>
          <View style={s.statsRow}>
            {[
              { num: stats.calcs_today, label: "Today" },
              { num: stats.calcs_week, label: "This Week" },
              { num: stats.calcs_month, label: "This Month" },
            ].map(({ num, label }) => (
              <View key={label} style={s.statCard}>
                <Text style={s.statNum}>{num}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
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
        </View>
      )}

      {/* Calculation history — shown only when logged in */}
      {user && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Calculations</Text>
          {historyLoading ? (
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
                <Ionicons name="chevron-forward" size={16} color={colors.tx3} style={s.historyChevron} />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

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
              <Text style={s.histDetailTitle}>{selectedHistoryItem?.peptide_name}</Text>
              <TouchableOpacity onPress={() => setSelectedHistoryItem(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={18} color={colors.tx3} />
              </TouchableOpacity>
            </View>
            {selectedHistoryItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.histDetailDate}>{formatDate(selectedHistoryItem.created_at)}</Text>
                {[
                  { label: "Draw volume", value: selectedHistoryItem.result_ml != null ? `${selectedHistoryItem.result_ml.toFixed(3)} mL` : "—" },
                  { label: "Insulin units", value: selectedHistoryItem.result_units != null ? `${selectedHistoryItem.result_units.toFixed(1)} IU` : "—" },
                  { label: "Concentration",
                    value: selectedHistoryItem.vial_mg && selectedHistoryItem.bac_water_ml
                      ? `${((selectedHistoryItem.vial_mg * 1000) / selectedHistoryItem.bac_water_ml).toFixed(0)} mcg/mL`
                      : "—" },
                  { label: "Doses per vial",
                    value: selectedHistoryItem.vial_mg && selectedHistoryItem.target_mcg
                      ? String(Math.floor((selectedHistoryItem.vial_mg * 1000) / selectedHistoryItem.target_mcg))
                      : "—" },
                ].map(({ label, value }) => (
                  <View key={label} style={s.resultRow}>
                    <Text style={s.resultLabel}>{label}</Text>
                    <Text style={s.resultValue}>{value}</Text>
                  </View>
                ))}
                <SyringeVisual units={selectedHistoryItem.result_units ?? 0} maxUnits={100} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
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
  gateText: { color: colors.tx3, fontSize: 13, textAlign: "center", paddingVertical: 8 },
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
  historyChevron: { position: "absolute", right: 0, top: "50%", color: colors.tx3 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
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
  histDetailTitle: { color: colors.teal, fontSize: 17, fontWeight: "700", flex: 1, marginRight: 12 },
  histDetailDate: { color: colors.tx3, fontSize: 12, marginBottom: 16 },
  resultRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  resultLabel: { color: colors.tx2, fontSize: 14 },
  resultValue: { color: colors.tx, fontSize: 14, fontWeight: "600" },
});
