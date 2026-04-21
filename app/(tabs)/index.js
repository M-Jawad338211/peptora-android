'use client'
import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Modal, Alert, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { calculatorApi } from '../../src/api'
import { getFingerprint } from '../../src/lib/fingerprint'
import { colors } from '../../src/lib/theme'
import * as WebBrowser from 'expo-web-browser'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.peptora.app'

const PEPTIDES = [
  'BPC-157','TB-500','GHK-Cu','Ipamorelin','CJC-1295 (no DAC)',
  'CJC-1295 (with DAC)','GHRP-2','GHRP-6','Sermorelin','Tesamorelin',
  'Semaglutide','Tirzepatide','Retatrutide','AOD-9604','Semax',
  'Selank','Epitalon','Thymosin Alpha-1','MOTS-C','SS-31',
  'KPV','MK-677','PT-141','Melanotan II','Custom',
]

export default function CalculatorTab() {
  const router = useRouter()
  const [fp, setFp] = useState('')
  const [trial, setTrial] = useState(null)
  const [peptide, setPeptide] = useState(PEPTIDES[0])
  const [showPicker, setShowPicker] = useState(false)
  const [vialMg, setVialMg] = useState('')
  const [bacMl, setBacMl] = useState('')
  const [targetMcg, setTargetMcg] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    getFingerprint().then(f => {
      setFp(f)
      calculatorApi.checkTrial(f, 'android').then(r => setTrial(r.data)).catch(() => {})
    })
  }, [])

  const calculate = async () => {
    if (!vialMg || !bacMl || !targetMcg) {
      Alert.alert('Missing values', 'Please fill in all three fields')
      return
    }
    setLoading(true)
    try {
      const check = await calculatorApi.checkTrial(fp, 'android')
      setTrial(check.data)
      if (!check.data.allowed) {
        setModal(check.data.reason === 'anonymous_limit' ? 'signup' : 'paywall')
        setLoading(false)
        return
      }
      const vial = parseFloat(vialMg)
      const bac = parseFloat(bacMl)
      const target = parseFloat(targetMcg)
      const conc = (vial * 1000) / bac
      const drawMl = target / conc
      const drawUnits = drawMl * 100
      const doses = Math.floor((vial * 1000) / target)
      setResult({ drawMl: drawMl.toFixed(3), drawUnits: drawUnits.toFixed(1), doses, conc: conc.toFixed(0) })
      await calculatorApi.recordUse({ device_fingerprint: fp, platform: 'android', peptide_name: peptide, vial_mg: vial, bac_water_ml: bac, target_dose_mcg: target, draw_ml: drawMl })
    } catch (e) {
      Alert.alert('Error', 'Could not calculate. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      <View style={s.disclaimer}>
        <Text style={s.disclaimerText}>For research purposes only. Not medical advice.</Text>
      </View>

      {trial && (
        <View style={s.trialBar}>
          <Text style={s.trialText}>
            {trial.remaining > 0 ? `${trial.remaining} free uses remaining` : 'Upgrade to Pro for unlimited'}
          </Text>
        </View>
      )}

      <Text style={s.label}>Peptide</Text>
      <TouchableOpacity style={s.picker} onPress={() => setShowPicker(true)}>
        <Text style={s.pickerText}>{peptide}</Text>
        <Text style={s.pickerArrow}>▼</Text>
      </TouchableOpacity>

      <Text style={s.label}>Vial size (mg)</Text>
      <TextInput style={s.input} value={vialMg} onChangeText={setVialMg} keyboardType="decimal-pad" placeholder="e.g. 5" placeholderTextColor={colors.tx3} />

      <Text style={s.label}>BAC water added (mL)</Text>
      <TextInput style={s.input} value={bacMl} onChangeText={setBacMl} keyboardType="decimal-pad" placeholder="e.g. 2" placeholderTextColor={colors.tx3} />

      <Text style={s.label}>Target dose (mcg)</Text>
      <TextInput style={s.input} value={targetMcg} onChangeText={setTargetMcg} keyboardType="decimal-pad" placeholder="e.g. 250" placeholderTextColor={colors.tx3} />

      <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={calculate} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Calculating…' : 'Calculate Dose'}</Text>
      </TouchableOpacity>

      {result && (
        <View style={s.result}>
          <Text style={s.resultTitle}>Your dose for {peptide}</Text>
          <View style={s.resultRow}><Text style={s.resultLabel}>Draw volume</Text><Text style={s.resultValue}>{result.drawMl} mL</Text></View>
          <View style={s.resultRow}><Text style={s.resultLabel}>Insulin units</Text><Text style={s.resultValue}>{result.drawUnits} IU</Text></View>
          <View style={s.resultRow}><Text style={s.resultLabel}>Concentration</Text><Text style={s.resultValue}>{result.conc} mcg/mL</Text></View>
          <View style={s.resultRow}><Text style={s.resultLabel}>Doses per vial</Text><Text style={s.resultValue}>{result.doses}</Text></View>
          <View style={s.guide}>
            <Text style={s.guideTitle}>Reconstitution guide</Text>
            <Text style={s.guideStep}>1. Wipe vial top with alcohol swab</Text>
            <Text style={s.guideStep}>2. Inject BAC water down inner wall slowly</Text>
            <Text style={s.guideStep}>3. Swirl gently — never shake</Text>
            <Text style={s.guideStep}>4. Store refrigerated at 2–8°C</Text>
            <Text style={s.guideStep}>5. Use within 30 days once reconstituted</Text>
          </View>
        </View>
      )}

      {/* Peptide picker modal */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Select Peptide</Text>
            <ScrollView>
              {PEPTIDES.map(p => (
                <TouchableOpacity key={p} style={s.peptideRow} onPress={() => { setPeptide(p); setShowPicker(false) }}>
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

      {/* Signup modal */}
      <Modal visible={modal === 'signup'} animationType="fade" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalIcon}>🔒</Text>
            <Text style={s.modalHeading}>Create a free account</Text>
            <Text style={s.modalBody}>You've used your 5 anonymous calculations. Create a free account for 25 more.</Text>
            <TouchableOpacity style={s.btn} onPress={() => { setModal(null); router.push('/auth/signup') }}>
              <Text style={s.btnText}>Create Free Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkBtn} onPress={() => { setModal(null); router.push('/auth/login') }}>
              <Text style={s.linkBtnText}>Already have an account? Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(null)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Paywall modal */}
      <Modal visible={modal === 'paywall'} animationType="fade" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalIcon}>⭐</Text>
            <Text style={s.modalHeading}>Upgrade to Pro</Text>
            <Text style={s.modalBody}>You've used your 25 free calculations. Peptora Pro gives you unlimited access plus AI tools.</Text>
            <TouchableOpacity style={s.btn} onPress={async () => {
              setModal(null)
              await WebBrowser.openBrowserAsync(`${API_URL.replace('api.', '')}/pricing`)
            }}>
              <Text style={s.btnText}>View Pro Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModal(null)}><Text style={s.cancel}>Maybe later</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  disclaimer: { backgroundColor: 'rgba(255,71,87,0.12)', borderRadius: 8, padding: 10, marginBottom: 16 },
  disclaimerText: { color: '#ff6b7a', fontSize: 12, textAlign: 'center', fontWeight: '500' },
  trialBar: { backgroundColor: 'rgba(0,214,143,0.1)', borderRadius: 8, padding: 10, marginBottom: 16 },
  trialText: { color: colors.teal, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  label: { color: colors.tx2, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, color: colors.tx, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  picker: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  pickerText: { color: colors.tx, fontSize: 16 },
  pickerArrow: { color: colors.tx3, fontSize: 12 },
  btn: { backgroundColor: colors.teal, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#021a0e', fontSize: 16, fontWeight: '700' },
  result: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginTop: 24, borderWidth: 1, borderColor: 'rgba(0,214,143,0.2)' },
  resultTitle: { color: colors.teal, fontSize: 15, fontWeight: '700', marginBottom: 14 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resultLabel: { color: colors.tx2, fontSize: 14 },
  resultValue: { color: colors.tx, fontSize: 14, fontWeight: '600' },
  guide: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  guideTitle: { color: colors.tx2, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  guideStep: { color: colors.tx2, fontSize: 13, marginBottom: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.navyLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' },
  modalTitle: { color: colors.tx, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  peptideRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  peptideItem: { color: colors.tx, fontSize: 16 },
  peptideItemActive: { color: colors.teal, fontWeight: '700' },
  modalClose: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  modalCloseText: { color: colors.tx2, fontSize: 16 },
  modalCard: { backgroundColor: colors.navyLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 32, alignItems: 'center' },
  modalIcon: { fontSize: 44, marginBottom: 12 },
  modalHeading: { color: colors.tx, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  modalBody: { color: colors.tx2, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  linkBtn: { marginTop: 12 },
  linkBtnText: { color: colors.teal, fontSize: 14 },
  cancel: { color: colors.tx3, fontSize: 14, marginTop: 16 },
})
