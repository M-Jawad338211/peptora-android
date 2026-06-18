import { useState } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  TextInput, ActivityIndicator, StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { encyclopediaApi } from "../api";
import { colors, fonts } from "../lib/theme";

export default function PeptideSelect({ selectedId, onSelect }) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const { data: peptides = [], isLoading } = useQuery({
    queryKey: ["peptides", "list"],
    queryFn: () => encyclopediaApi.list().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const filtered = peptides.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.aliases ?? []).some((a) => a.toLowerCase().includes(search.toLowerCase()))
  );

  const selected = peptides.find((p) => p.id === selectedId);

  return (
    <>
      <TouchableOpacity style={s.picker} onPress={() => setVisible(true)} activeOpacity={0.8}>
        <Text style={[s.pickerText, !selected && s.placeholder]}>
          {selected ? selected.name : "Select peptide…"}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.tx3} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Select Peptide</Text>
              <TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={20} color={colors.tx3} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search…"
              placeholderTextColor={colors.tx3}
              autoFocus
            />
            {isLoading ? (
              <ActivityIndicator color={colors.teal} style={{ marginTop: 20 }} />
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                {filtered.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={s.row}
                    onPress={() => {
                      onSelect(p.id);
                      setVisible(false);
                      setSearch("");
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowName, p.id === selectedId && s.rowNameActive]}>
                        {p.name}
                      </Text>
                      {p.default_dose_unit && (
                        <Text style={s.rowMeta}>{p.default_dose_unit} · {p.category}</Text>
                      )}
                    </View>
                    {p.id === selectedId && (
                      <Ionicons name="checkmark" size={16} color={colors.teal} />
                    )}
                  </TouchableOpacity>
                ))}
                {filtered.length === 0 && (
                  <Text style={s.empty}>No peptides match "{search}"</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
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
  placeholder: { color: colors.tx3 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.navyLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sheetTitle: { color: colors.tx, fontSize: 18, fontWeight: "700" },
  search: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    padding: 12,
    color: colors.tx,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: { color: colors.tx, fontSize: 16 },
  rowNameActive: { color: colors.teal, fontWeight: "700" },
  rowMeta: { color: colors.tx3, fontSize: 12, marginTop: 2 },
  empty: { color: colors.tx3, textAlign: "center", marginTop: 24, fontSize: 14 },
});
