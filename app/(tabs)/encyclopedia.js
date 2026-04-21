import { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../../src/lib/theme'

const PEPTIDES = [
  { name: 'BPC-157', category: 'Healing', status: 'Research', desc: 'Body Protection Compound. Accelerates healing of tendons, muscles, and gut lining.', dose: '250–500 mcg/day', half_life: '4–6 hours' },
  { name: 'TB-500', category: 'Healing', status: 'Research', desc: 'Thymosin Beta-4 fragment. Promotes healing, reduces inflammation, and improves flexibility.', dose: '2.0–2.5 mg twice weekly', half_life: 'Long-acting' },
  { name: 'GHK-Cu', category: 'Anti-aging', status: 'Research', desc: 'Copper peptide with wound healing and collagen synthesis properties.', dose: '1–2 mg/day', half_life: 'Short' },
  { name: 'Ipamorelin', category: 'GH Secretagogue', status: 'Research', desc: 'Selective GHRP with minimal side effects. Clean GH pulse stimulation.', dose: '200–300 mcg 2–3x/day', half_life: '2 hours' },
  { name: 'CJC-1295 (no DAC)', category: 'GH Secretagogue', status: 'Research', desc: 'GHRH analogue. Short-acting, best combined with Ipamorelin.', dose: '100–200 mcg 2–3x/day', half_life: '30 min' },
  { name: 'Semaglutide', category: 'GLP-1', status: 'FDA Approved', desc: 'GLP-1 receptor agonist approved for T2D and obesity (Ozempic/Wegovy).', dose: '0.25–2.4 mg/week', half_life: '7 days' },
  { name: 'Tirzepatide', category: 'GIP/GLP-1', status: 'FDA Approved', desc: 'Dual GIP/GLP-1 agonist (Mounjaro/Zepbound). Superior weight loss vs semaglutide.', dose: '2.5–15 mg/week', half_life: '5 days' },
  { name: 'Semax', category: 'Nootropic', status: 'Research', desc: 'ACTH analogue with neuroprotective and cognitive-enhancing properties.', dose: '300–600 mcg/day', half_life: 'Short' },
  { name: 'Selank', category: 'Nootropic', status: 'Research', desc: 'Anxiolytic peptide derived from tuftsin. Reduces anxiety without sedation.', dose: '250–500 mcg/day', half_life: 'Short' },
  { name: 'Thymosin Alpha-1', category: 'Immune', status: 'Research', desc: 'Immune modulator. Used in chronic infections and immune dysregulation.', dose: '1.6 mg 1–2x/week', half_life: '2 hours' },
  { name: 'Epitalon', category: 'Anti-aging', status: 'Research', desc: 'Tetrapeptide that activates telomerase, potential anti-aging effects.', dose: '5–10 mg/day', half_life: 'Unknown' },
  { name: 'MOTS-C', category: 'Mitochondrial', status: 'Research', desc: 'Mitochondria-derived peptide. Improves insulin sensitivity and metabolic function.', dose: '5–10 mg/week', half_life: 'Unknown' },
  { name: 'KPV', category: 'Anti-inflammatory', status: 'Research', desc: 'MSH fragment with anti-inflammatory effects. Used for IBD and skin conditions.', dose: '0.5–1 mg/day', half_life: 'Short' },
  { name: 'PT-141', category: 'Sexual Health', status: 'FDA Approved', desc: 'Melanocortin receptor agonist approved for hypoactive sexual desire (Vyleesi).', dose: '1.75 mg as needed', half_life: '~8 hours' },
  { name: 'AOD-9604', category: 'Metabolic', status: 'Research', desc: 'GH fragment 177-191. Targets fat metabolism without IGF-1 effects.', dose: '300 mcg/day', half_life: 'Short' },
  { name: 'SS-31', category: 'Mitochondrial', status: 'Research', desc: 'Mitochondria-targeted antioxidant peptide with cardioprotective properties.', dose: '2–4 mg/day', half_life: 'Short' },
]

const STATUS_COLOR = { 'FDA Approved': colors.teal, 'Research': colors.yellow }

export default function EncyclopediaTab() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = PEPTIDES.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
        <TouchableOpacity style={s.backBtn} onPress={() => setSelected(null)}>
          <Text style={s.backBtnText}>← Back to list</Text>
        </TouchableOpacity>
        <View style={s.detailCard}>
          <View style={s.detailHeader}>
            <Text style={s.detailName}>{selected.name}</Text>
            <View style={[s.badge, { backgroundColor: STATUS_COLOR[selected.status] || colors.tx3 }]}>
              <Text style={s.badgeText}>{selected.status}</Text>
            </View>
          </View>
          <Text style={s.category}>{selected.category}</Text>
          <Text style={s.desc}>{selected.desc}</Text>
          <View style={s.divider} />
          <View style={s.infoRow}><Text style={s.infoLabel}>Typical dose</Text><Text style={s.infoValue}>{selected.dose}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>Half-life</Text><Text style={s.infoValue}>{selected.half_life}</Text></View>
        </View>
      </ScrollView>
    )
  }

  return (
    <View style={s.container}>
      <View style={s.searchWrap}>
        <TextInput style={s.search} value={search} onChangeText={setSearch} placeholder="Search peptides…" placeholderTextColor={colors.tx3} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {filtered.map(p => (
          <TouchableOpacity key={p.name} style={s.card} onPress={() => setSelected(p)}>
            <View style={s.cardTop}>
              <Text style={s.cardName}>{p.name}</Text>
              <View style={[s.badge, { backgroundColor: STATUS_COLOR[p.status] || colors.tx3 }]}>
                <Text style={s.badgeText}>{p.status}</Text>
              </View>
            </View>
            <Text style={s.cardCategory}>{p.category}</Text>
            <Text style={s.cardDesc} numberOfLines={2}>{p.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  searchWrap: { padding: 16, paddingBottom: 0 },
  search: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, color: colors.tx, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { color: colors.tx, fontSize: 16, fontWeight: '700' },
  badge: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#021a0e' },
  cardCategory: { color: colors.tx3, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  cardDesc: { color: colors.tx2, fontSize: 13, lineHeight: 18 },
  backBtn: { marginBottom: 16 },
  backBtnText: { color: colors.teal, fontSize: 15 },
  detailCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: colors.border },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  detailName: { color: colors.tx, fontSize: 22, fontWeight: '700', flex: 1 },
  category: { color: colors.tx3, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  desc: { color: colors.tx2, fontSize: 15, lineHeight: 24, marginBottom: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoLabel: { color: colors.tx2, fontSize: 14 },
  infoValue: { color: colors.tx, fontSize: 14, fontWeight: '600' },
})
