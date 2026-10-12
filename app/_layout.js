import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, asyncStoragePersister, PERSIST_MAX_AGE } from '../src/lib/queryClient'
import { IapProvider } from '../src/lib/iap'

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister, maxAge: PERSIST_MAX_AGE }}
    >
      {/* One App Store connection for the whole session: renewals and
          interrupted purchases are delivered at launch, not on the paywall. */}
      <IapProvider>
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
          <Stack.Screen name="delete-account" options={{ title: 'Delete Account', presentation: 'modal' }} />
          {/* Account settings: pushed from the Profile tab, one screen per step. */}
          <Stack.Screen name="account/edit-profile" options={{ title: 'Edit profile' }} />
          <Stack.Screen name="account/change-email" options={{ title: 'Email address' }} />
          <Stack.Screen name="account/change-password" options={{ title: 'Change password' }} />
          <Stack.Screen name="account/devices" options={{ title: 'Other devices' }} />
          <Stack.Screen name="account/two-factor" options={{ title: 'Two-factor authentication' }} />
          <Stack.Screen name="account/two-factor-setup" options={{ title: 'Turn on two-factor' }} />
          <Stack.Screen name="account/recovery-codes" options={{ title: 'Recovery codes' }} />
          <Stack.Screen name="account/two-factor-off" options={{ title: 'Turn off two-factor' }} />
          <Stack.Screen name="account/activity" options={{ title: 'Recent activity' }} />
          <Stack.Screen name="account/billing-history" options={{ title: 'Billing history' }} />
          <Stack.Screen name="consent" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
      </IapProvider>
    </PersistQueryClientProvider>
  )
}
