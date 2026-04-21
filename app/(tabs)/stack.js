import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { colors } from '../../src/lib/theme'
import { aiApi } from '../../src/api'
import { getStoredToken } from '../../src/api/client'

const PEPTIDES = [
  'BPC-157','TB-500','GHK-Cu','Ipamorelin','CJC-1295 (no DAC)',
  'Semaglutide','Tirzepatide','Semax','Selank','Thymosin Alpha-1',
  'Epitalon','MOTS-C','KPV','PT-141','AOD-9604','SS-31',
]

export default function StackTab() {
  const router = useRouter()
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggle = (p) => {
    setSelected(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : prev.length < 5 ? [...prev, p] : prev
    )
  }

  const analyse = async () => {
    const token = await getStoredToken()
    if (!token) { router.push('/auth/login'); return }
    if (selected.length < 2) { setError('Select at least 2 peptides'); return }
    setError('')
    setLoading(true)
    try {
      const r = await aiApi.stackCheck(selected)
      setResult(r.data.result || r.data.response || r.data)
    } catch (e) {
      if (e.response?.status === 402) router.push('/paywall')
      else setError('Analysis failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={s.title}>Stack Checker</Text>
      <Text style={s.subtitle}>Select 2–5 peptides for AI compatibility analysis</Text>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.grid}>
        {PEPTIDES.map(p => (
          <TouchableOpacity key={p} style={[s.chip, selected.includes(p) && s.chipActive]} onPress={() => toggle(p)}>
            <Text style={[s.chipText, selected.includes(p) && s.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.hint}>{selected.length}/5 selected</Text>

      <TouchableOpacity style={[s.btn, selected.length < 2 && s.btnDisabled]} onPress={analyse} disabled={loading || selected.length < 2}>
        {loading ? <ActivityIndicator color="#021a0e" /> : <Text style={s.btnText}>Analyse Stack</Text>}
      </TouchableOpacity>

      {result && (
        <View style={s.resultBox}>
          <Text style={s.resultTitle}>Stack Analysis</Text>
          <Text style={s.resultText}>{typeof result === 'string' ? result : JSON.stringify(result)}</Text>
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  title: { color: colors.tx, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.tx2, fontSize: 14, marginBottom: 20 },
  error: { color: colors.red, fontSize: 13, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: 'rgba(0,214,143,0.15)', borderColor: colors.teal },
  chipText: { color: colors.tx2, fontSize: 13 },
  chipTextActive: { color: colors.teal, fontWeight: '600' },
  hint: { color: colors.tx3, fontSize: 12, marginBottom: 16 },
  btn: { backgroundColor: colors.teal, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#021a0e', fontSize: 16, fontWeight: '700' },
  resultBox: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginTop: 24, borderWidth: 1, borderColor: 'rgba(0,214,143,0.2)' },
  resultTitle: { color: colors.teal, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  resultText: { color: colors.tx, fontSize: 14, lineHeight: 22 },
})
