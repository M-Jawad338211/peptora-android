import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../src/lib/theme'
import { authApi } from '../../src/api'
import { saveTokens } from '../../src/api/client'
import { AUTH_SESSION_KEY, invalidateAuthSession } from '../../src/lib/auth'
import { afterSignIn } from '../../src/lib/nav'
import { cleanCode, loginFailure, secondFactorBody, secondFactorReady } from '../../src/lib/account'

export default function LoginScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // The second step, for an account with two-factor authentication on. The
  // server answers the first request with 401 and code "two_factor_required";
  // the email and password stay here, in memory, so the same request can be
  // sent again with the code added. Nothing is stored.
  const [step, setStep] = useState('credentials') // credentials | code | recovery-left
  const [useRecovery, setUseRecovery] = useState(false)
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [codeError, setCodeError] = useState(null)
  const [recoveryLeft, setRecoveryLeft] = useState(null)

  const finishSignIn = async (data) => {
    await saveTokens(data.access_token, data.refresh_token)
    await invalidateAuthSession(queryClient)
    if (data.two_factor === 'recovery_code' && typeof data.recovery_codes_remaining === 'number') {
      // A recovery code is spent for good: say how many are left before
      // leaving, on a screen of its own so that it cannot be missed.
      setPassword('')
      setCode('')
      setRecoveryCode('')
      setRecoveryLeft(data.recovery_codes_remaining)
      setStep('recovery-left')
      return
    }
    afterSignIn(router, queryClient.getQueryData(AUTH_SESSION_KEY))
  }

  const login = async () => {
    const address = email.trim()
    if (!address || !password) { Alert.alert('Error', 'Fill in all fields'); return }
    setLoading(true)
    try {
      const r = await authApi.login(address, password)
      if (r.data.requires_verification) {
        router.replace({ pathname: '/auth/verify-email', params: { email: address } })
        return
      }
      await finishSignIn(r.data)
    } catch (e) {
      const failure = loginFailure(e)
      if (failure.kind === 'required') {
        setUseRecovery(false)
        setCode('')
        setRecoveryCode('')
        setCodeError(null)
        setStep('code')
      } else {
        Alert.alert('Login failed', failure.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const submitCode = async () => {
    if (!secondFactorReady({ useRecovery, code, recoveryCode })) return
    setLoading(true)
    setCodeError(null)
    try {
      const body = secondFactorBody({ useRecovery, code, recoveryCode, codeKey: 'totp_code' })
      const r = await authApi.login(email.trim(), password, body)
      await finishSignIn(r.data)
    } catch (e) {
      // Whatever was typed stays in the box. A wrong or locked code shows the
      // server's own sentence.
      setCodeError(loginFailure(e).message)
    } finally {
      setLoading(false)
    }
  }

  const backToCredentials = () => {
    setStep('credentials')
    setCodeError(null)
    setCode('')
    setRecoveryCode('')
  }

  const switchMethod = () => {
    setUseRecovery((v) => !v)
    setCodeError(null)
  }

  const ready = secondFactorReady({ useRecovery, code, recoveryCode })

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        {step === 'credentials' && (
          <>
            <Text style={s.title}>Welcome back</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="Email" accessibilityLabel="Email" placeholderTextColor={colors.tx3} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Password" accessibilityLabel="Password" placeholderTextColor={colors.tx3} secureTextEntry />
            <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={login} disabled={loading}>
              <Text style={s.btnText}>{loading ? 'Logging in' : 'Log In'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkRow} onPress={() => { router.dismiss(); setTimeout(() => router.push('/auth/signup'), 100) }}>
              <Text style={s.link}>No account? Create one free</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.teal} />
            </TouchableOpacity>
          </>
        )}

        {step === 'code' && (
          <>
            <Text style={s.title}>Enter your code</Text>
            <Text style={s.sub}>
              {useRecovery
                ? `Enter one of your recovery codes to finish signing in as ${email.trim()}. Each code works once.`
                : `Enter the 6-digit code from your authenticator app to finish signing in as ${email.trim()}.`}
            </Text>
            {useRecovery ? (
              <>
                <Text style={s.label}>Recovery code</Text>
                <TextInput
                  style={s.input}
                  value={recoveryCode}
                  onChangeText={(v) => { setRecoveryCode(v); setCodeError(null) }}
                  placeholder="xxxxx-xxxxx"
                  accessibilityLabel="Recovery code"
                  placeholderTextColor={colors.tx3}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </>
            ) : (
              <>
                <Text style={s.label}>6-digit code</Text>
                <TextInput
                  style={[s.input, s.otp]}
                  value={code}
                  onChangeText={(v) => { setCode(cleanCode(v)); setCodeError(null) }}
                  placeholder="000000"
                  accessibilityLabel="6-digit code"
                  placeholderTextColor={colors.tx3}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  autoFocus
                />
              </>
            )}
            {codeError ? <Text style={s.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{codeError}</Text> : null}
            <TouchableOpacity style={[s.btn, (loading || !ready) && s.btnDisabled]} onPress={submitCode} disabled={loading || !ready}>
              <Text style={s.btnText}>{loading ? 'Checking' : 'Log In'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkRow} onPress={switchMethod} disabled={loading}>
              <Text style={s.link}>{useRecovery ? 'Use an authenticator code instead' : 'Use a recovery code instead'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.linkRow} onPress={backToCredentials} disabled={loading}>
              <Text style={s.linkMuted}>Back</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'recovery-left' && (
          <>
            <Text style={s.title}>You are signed in</Text>
            <View style={s.notice}>
              <Text style={s.noticeTitle}>You used a recovery code</Text>
              <Text style={s.noticeText}>
                {recoveryLeft === 0
                  ? 'You have no recovery codes left. '
                  : `You have ${recoveryLeft} recovery code${recoveryLeft === 1 ? '' : 's'} left. `}
                Get new ones in Profile, under Two-factor authentication.
              </Text>
            </View>
            <TouchableOpacity
              style={s.btn}
              onPress={() => afterSignIn(router, queryClient.getQueryData(AUTH_SESSION_KEY))}
            >
              <Text style={s.btnText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  inner: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  title: { color: colors.tx, fontSize: 28, fontWeight: '700', marginBottom: 28 },
  sub: { color: colors.tx2, fontSize: 14, lineHeight: 22, marginTop: -16, marginBottom: 24 },
  label: { color: colors.tx2, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, color: colors.tx, fontSize: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  otp: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  error: { color: colors.red, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  btn: { backgroundColor: colors.teal, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#021a0e', fontSize: 16, fontWeight: '700' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20 },
  link: { color: colors.teal, fontSize: 14 },
  linkMuted: { color: colors.tx2, fontSize: 14 },
  notice: { backgroundColor: 'rgba(255,211,42,0.07)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,211,42,0.30)', padding: 14, marginBottom: 12 },
  noticeTitle: { color: colors.yellow, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  noticeText: { color: colors.tx, fontSize: 14, lineHeight: 20 },
})
