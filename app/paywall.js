import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../src/lib/theme'
import { subscriptionsApi } from '../src/api'

const FEATURES = [
  'Unlimited dose calculations',
  'AI Stack Checker (up to 5 peptides)',
  'Cycle Tracker with AI weekly summaries',
  'Protocol Finder — goal-based AI recommendations',
  'AI Research Assistant — ask anything',
  'Peptide Encyclopedia (all 100+ entries)',
  'Calculation history & export',
]

export default function PaywallScreen() {
  const router = useRouter()

  const subscribe = async (plan) => {
    try {
      const r = await subscriptionsApi.createCheckout(plan)
      const checkoutUrl = r.data.checkout_url || r.data.url
      if (checkoutUrl) await WebBrowser.openBrowserAsync(checkoutUrl)
    } catch (e) {
      await WebBrowser.openBrowserAsync('https://peptora.app/pricing')
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 24, paddingTop: 40 }}>
      <Ionicons name="star" size={44} color={colors.teal} style={s.icon} />
      <Text style={s.title}>Peptora Pro</Text>
      <Text style={s.sub}>Everything you need for serious peptide research.</Text>

      <View style={s.features}>
        {FEATURES.map(f => (
          <View key={f} style={s.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.teal} style={s.checkmark} />
            <Text style={s.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.planCard} onPress={() => subscribe('monthly')}>
        <View>
          <Text style={s.planName}>Monthly</Text>
          <Text style={s.planPrice}>£9.99 / month</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.teal} />
      </TouchableOpacity>

      <TouchableOpacity style={[s.planCard, s.planCardBest]} onPress={() => subscribe('annual')}>
        <View>
          <View style={s.bestBadge}><Text style={s.bestText}>Best value</Text></View>
          <Text style={s.planName}>Annual</Text>
          <Text style={s.planPrice}>£79 / year</Text>
          <Text style={s.planSaving}>Save £40 vs monthly</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.teal} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.dismiss()}>
        <Text style={s.cancel}>Maybe later</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  icon: { alignSelf: 'center', marginBottom: 12 },
  title: { color: colors.tx, fontSize: 30, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sub: { color: colors.tx2, fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  features: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  checkmark: { color: colors.teal, fontSize: 15, fontWeight: '700', marginRight: 10, marginTop: 1 },
  featureText: { color: colors.tx, fontSize: 14, flex: 1, lineHeight: 20 },
  planCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  planCardBest: { borderColor: colors.teal, backgroundColor: 'rgba(0,214,143,0.06)' },
  bestBadge: { backgroundColor: colors.teal, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 },
  bestText: { color: '#021a0e', fontSize: 10, fontWeight: '700' },
  planName: { color: colors.tx, fontSize: 17, fontWeight: '700' },
  planPrice: { color: colors.teal, fontSize: 15, fontWeight: '600', marginTop: 2 },
  planSaving: { color: colors.tx3, fontSize: 12, marginTop: 2 },
  planArrow: { color: colors.teal, fontSize: 20 },
  cancel: { color: colors.tx3, fontSize: 14, textAlign: 'center', marginTop: 16 },
})
