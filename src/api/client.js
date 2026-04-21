import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.peptora.app'

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  try {
    const token = Platform.OS === 'web'
      ? sessionStorage.getItem('access_token')
      : await SecureStore.getItemAsync('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

api.interceptors.response.use(
  r => r,
  async (err) => {
    if (err.response?.status === 401) await clearTokens()
    return Promise.reject(err)
  }
)

export const saveTokens = async (access, refresh) => {
  if (Platform.OS === 'web') {
    sessionStorage.setItem('access_token', access)
    sessionStorage.setItem('refresh_token', refresh)
  } else {
    await SecureStore.setItemAsync('access_token', access)
    await SecureStore.setItemAsync('refresh_token', refresh)
  }
}

export const clearTokens = async () => {
  if (Platform.OS === 'web') {
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
  } else {
    await SecureStore.deleteItemAsync('access_token').catch(() => {})
    await SecureStore.deleteItemAsync('refresh_token').catch(() => {})
  }
}

export const getStoredToken = async () => {
  if (Platform.OS === 'web') return sessionStorage.getItem('access_token')
  return SecureStore.getItemAsync('access_token')
}

export default api
