import * as Device from 'expo-device'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

export async function getFingerprint() {
  const key = 'device_fingerprint'
  try {
    const stored = Platform.OS === 'web'
      ? sessionStorage.getItem(key)
      : await SecureStore.getItemAsync(key)
    if (stored) return stored

    const raw = Platform.OS === 'web'
      ? `web-${navigator.userAgent}-${screen.width}x${screen.height}`
      : `${Device.osInternalBuildId || 'unknown'}-${Platform.OS}-${Device.modelName || 'device'}`

    const encoder = new TextEncoder()
    const data = encoder.encode(raw)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const fp = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    if (Platform.OS === 'web') sessionStorage.setItem(key, fp)
    else await SecureStore.setItemAsync(key, fp)
    return fp
  } catch {
    return 'fallback-fp-android'
  }
}
