import { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { colors } from '../../src/lib/theme'
import { aiApi } from '../../src/api'
import { getStoredToken } from '../../src/api/client'

export default function TrackerTab() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [peptide, setPeptide] = useState('')
  const [dose, setDose] = useState('')
  const [notes, setNotes] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const addLog = () => {
    if (!peptide || !dose) return
    setLogs(prev => [...prev, { id: Date.now(), date: new Date().toLocaleDateString(), peptide, dose, notes }])
    setPeptide('')
    setDose('')
    setNotes('')
  }

  const getSummary = async () => {
    const token = await getStoredToken()
    if (!token) { router.push('/auth/login'); return }
    if (logs.length === 0) return
    setLoading(true)
    try {
      const r = await aiApi.chat(
        `Give a brief weekly summary and observations for this peptide cycle log: ${JSON.stringify(logs)}`,
        []
      )
      setSummary(r.data.response || r.data.message || '')
    } catch (e) {
      if (e.response?.status === 402) router.push('/paywall')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={s.title}>Cycle Tracker</Text>
      <Text style={s.subtitle}>Log your daily protocol and get AI-powered weekly summaries</Text>

      <View style={s.form}>
        <TextInput style={s.input} value={peptide} onChangeText={setPeptide} placeholder="Peptide name" placeholderTextColor={colors.tx3} />
        <TextInput style={s.input} value={dose} onChangeText={setDose} placeholder="Dose (e.g. 250 mcg)" placeholderTextColor={colors.tx3} />
        <TextInput style={[s.input, s.textArea]} value={notes} onChangeText={setNotes} placeholder="Notes (optional)" placeholderTextColor={colors.tx3} multiline numberOfLines={3} />
        <TouchableOpacity style={s.addBtn} onPress={addLog}>
          <Text style={s.addBtnText}>+ Add Log Entry</Text>
        </TouchableOpacity>
      </View>

      {logs.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Log ({logs.length} entries)</Text>
          {logs.slice().reverse().map(log => (
            <View key={log.id} style={s.logCard}>
              <View style={s.logRow}>
                <Text style={s.logPeptide}>{log.peptide}</Text>
                <Text style={s.logDate}>{log.date}</Text>
              </View>
              <Text style={s.logDose}>{log.dose}</Text>
              {log.notes ? <Text style={s.logNotes}>{log.notes}</Text> : null}
            </View>
          ))}

          <TouchableOpacity style={s.summaryBtn} onPress={getSummary} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.teal} /> : <Text style={s.summaryBtnText}>Get AI Weekly Summary</Text>}
          </TouchableOpacity>
        </>
      )}

      {summary ? (
        <View style={s.summaryBox}>
          <Text style={s.summaryTitle}>AI Summary</Text>
          <Text style={s.summaryText}>{summary}</Text>
        </View>
      ) : null}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  title: { color: colors.tx, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.tx2, fontSize: 14, marginBottom: 20 },
  form: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.navy, borderRadius: 8, padding: 12, color: colors.tx, fontSize: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  textArea: { height: 70, textAlignVertical: 'top' },
  addBtn: { backgroundColor: colors.teal, borderRadius: 10, padding: 13, alignItems: 'center' },
  addBtnText: { color: '#021a0e', fontSize: 15, fontWeight: '700' },
  sectionTitle: { color: colors.tx2, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  logCard: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logPeptide: { color: colors.tx, fontSize: 15, fontWeight: '600' },
  logDate: { color: colors.tx3, fontSize: 12 },
  logDose: { color: colors.teal, fontSize: 13, marginBottom: 4 },
  logNotes: { color: colors.tx2, fontSize: 13 },
  summaryBtn: { backgroundColor: 'rgba(0,214,143,0.12)', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: 'rgba(0,214,143,0.3)' },
  summaryBtnText: { color: colors.teal, fontSize: 14, fontWeight: '600' },
  summaryBox: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginTop: 16, borderWidth: 1, borderColor: 'rgba(0,214,143,0.2)' },
  summaryTitle: { color: colors.teal, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  summaryText: { color: colors.tx, fontSize: 14, lineHeight: 22 },
})
