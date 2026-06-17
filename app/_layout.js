import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, asyncStoragePersister, PERSIST_MAX_AGE } from '../src/lib/queryClient'

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister, maxAge: PERSIST_MAX_AGE }}
    >
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: '#1a2535' },
        headerTintColor: '#e8edf5',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#1a2535' },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Log In', presentation: 'modal' }} />
        <Stack.Screen name="auth/signup" options={{ title: 'Create Account', presentation: 'modal' }} />
        <Stack.Screen name="auth/verify-email" options={{ title: 'Verify Email', presentation: 'modal' }} />
        <Stack.Screen name="paywall" options={{ title: 'Peptora Pro', presentation: 'modal' }} />
        <Stack.Screen name="consent" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </PersistQueryClientProvider>
  )
}
