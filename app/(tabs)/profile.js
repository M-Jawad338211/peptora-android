import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { colors } from '../../src/lib/theme'
import { authApi } from '../../src/api'
import { clearTokens, getStoredToken } from '../../src/api/client'

export default function ProfileTab() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStoredToken().then(token => {
      if (!token) { setLoading(false); return }
      authApi.me().then(r => setUser(r.data)).catch(() => {}).finally(() => setLoading(false))
    })
  }, [])

  const logout = async () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => {
        await authApi.logout().catch(() => {})
        await clearTokens()
        setUser(null)
      }},
    ])
  }

  if (loading) return <View style={s.center}><Text style={s.muted}>Loading…</Text></View>

  if (!user) return (
    <ScrollView style={s.container} contentContainerStyle={s.center}>
      <Text style={s.icon}>👤</Text>
      <Text style={s.heading}>Your Account</Text>
      <Text style={s.sub}>Sign in to track your cycle, access Pro tools, and manage your subscription.</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.push('/auth/signup')}>
        <Text style={s.btnText}>Create Free Account</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.outline} onPress={() => router.push('/auth/login')}>
        <Text style={s.outlineText}>Log In</Text>
      </TouchableOpacity>
    </ScrollView>
  )

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      <View style={s.profileCard}>
        <Text style={s.avatar}>{user.email[0].toUpperCase()}</Text>
        <View>
          <Text style={s.email}>{user.email}</Text>
          <View style={[s.planBadge, user.plan === 'pro' && s.planPro]}>
            <Text style={s.planText}>{user.plan === 'pro' ? 'Pro' : 'Free'}</Text>
          </View>
        </View>
      </View>

      {user.plan !== 'pro' && (
        <View style={s.upgradeCard}>
          <Text style={s.upgradeTitle}>Upgrade to Pro</Text>
          <Text style={s.upgradeSub}>Unlock unlimited calculations, AI tools, and stack analysis.</Text>
          <TouchableOpacity style={s.btn} onPress={() => router.push('/paywall')}>
            <Text style={s.btnText}>View Pro Plans</Text>
          </TouchableOpacity>
        </View>
      )}

      {user.trial_count && (
        <View style={s.statsCard}>
          <Text style={s.statsTitle}>Usage</Text>
          <View style={s.statRow}>
            <Text style={s.statLabel}>Total calculations</Text>
            <Text style={s.statValue}>{user.trial_count.calc_uses_free || 0}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  icon: { fontSize: 56, marginBottom: 16 },
  heading: { color: colors.tx, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  sub: { color: colors.tx2, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  btn: { backgroundColor: colors.teal, borderRadius: 12, padding: 15, alignItems: 'center', width: '100%', marginBottom: 10 },
  btnText: { color: '#021a0e', fontSize: 16, fontWeight: '700' },
  outline: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 15, alignItems: 'center', width: '100%' },
  outlineText: { color: colors.tx, fontSize: 16 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.teal, textAlign: 'center', lineHeight: 52, fontSize: 22, fontWeight: '700', color: '#021a0e' },
  email: { color: colors.tx, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  planBadge: { backgroundColor: colors.surface, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  planPro: { backgroundColor: 'rgba(0,214,143,0.15)', borderColor: colors.teal },
  planText: { color: colors.teal, fontSize: 11, fontWeight: '700' },
  upgradeCard: { backgroundColor: 'rgba(0,214,143,0.08)', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,214,143,0.2)' },
  upgradeTitle: { color: colors.teal, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  upgradeSub: { color: colors.tx2, fontSize: 13, marginBottom: 14, lineHeight: 20 },
  statsCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  statsTitle: { color: colors.tx2, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { color: colors.tx2, fontSize: 14 },
  statValue: { color: colors.tx, fontSize: 14, fontWeight: '600' },
  muted: { color: colors.tx3 },
  logoutBtn: { borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  logoutText: { color: colors.red, fontSize: 15, fontWeight: '600' },
})
