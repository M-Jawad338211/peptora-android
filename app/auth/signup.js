import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { colors } from '../../src/lib/theme'
import { authApi } from '../../src/api'
import { saveTokens } from '../../src/api/client'
import { getFingerprint } from '../../src/lib/fingerprint'

export default function SignupScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const signup = async () => {
    if (!email || !password || !name) { Alert.alert('Error', 'Fill in all fields'); return }
    if (password.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const fp = await getFingerprint()
      const r = await authApi.register(email, password, name, fp)
      await saveTokens(r.data.access_token, r.data.refresh_token)
      router.dismiss()
    } catch (e) {
      Alert.alert('Sign up failed', e.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <Text style={s.title}>Create free account</Text>
        <Text style={s.sub}>25 free calculations. No credit card needed.</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.tx3} />
        <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.tx3} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Password (min 8 chars)" placeholderTextColor={colors.tx3} secureTextEntry />
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={signup} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { router.dismiss(); setTimeout(() => router.push('/auth/login'), 100) }}>
          <Text style={s.link}>Already have an account? Log in →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  title: { color: colors.tx, fontSize: 28, fontWeight: '700', marginBottom: 6 },
  sub: { color: colors.tx2, fontSize: 14, marginBottom: 28 },
  input: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, color: colors.tx, fontSize: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  btn: { backgroundColor: colors.teal, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#021a0e', fontSize: 16, fontWeight: '700' },
  link: { color: colors.teal, fontSize: 14, textAlign: 'center', marginTop: 20 },
})
