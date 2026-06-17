import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../src/lib/theme'
import { authApi } from '../../src/api'
import { saveTokens } from '../../src/api/client'
import { invalidateAuthSession } from '../../src/lib/auth'

export default function LoginScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (!email || !password) { Alert.alert('Error', 'Fill in all fields'); return }
    setLoading(true)
    try {
      const r = await authApi.login(email, password)
      if (r.data.requires_verification) {
        router.replace({ pathname: '/auth/verify-email', params: { email } })
        return
      }
      await saveTokens(r.data.access_token, r.data.refresh_token)
      await invalidateAuthSession(queryClient)
      router.replace('/(tabs)')
    } catch (e) {
      Alert.alert('Login failed', e.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <Text style={s.title}>Welcome back</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.tx3} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.tx3} secureTextEntry />
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={login} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Logging in…' : 'Log In'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.linkRow} onPress={() => { router.dismiss(); setTimeout(() => router.push('/auth/signup'), 100) }}>
          <Text style={s.link}>No account? Create one free</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.teal} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  title: { color: colors.tx, fontSize: 28, fontWeight: '700', marginBottom: 28 },
  input: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, color: colors.tx, fontSize: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  btn: { backgroundColor: colors.teal, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#021a0e', fontSize: 16, fontWeight: '700' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20 },
  link: { color: colors.teal, fontSize: 14 },
})
